import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text as RNText, ScrollView, Pressable, Dimensions, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore, Track } from '@/store/usePlaybackStore';
import { useLocalAudio } from '@/hooks/use-local-audio';
import { getPlaylistsDB, deletePlaylistDB, renamePlaylistDB, createPlaylistDB } from '@/services/db';
import { extractLocalMetadata } from '@/services/metadata';
import TrackOptionsSheet from '@/components/track-options-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler } from 'react-native-reanimated';
import { InnerTubeClient } from '@/services/InnerTubeClient';
import { AppHeader } from '@/components/app-header';

const { width: screenWidth } = Dimensions.get('window');

// 🌟 Persistent Module-Level Metadata Cache (Fixes Tab Switching Glitch & Re-render Flickering)
const localMetadataCache = new Map<string, { title: string; artist: string; album: string; artwork: string | null }>();

interface LocalTrackItemProps {
  track: any;
  index: number;
  colors: any;
  favoriteTracks: string[];
  toggleFavorite: (track: Track) => void;
  playTrack: (track: Track, newQueue: Track[]) => void;
  localQueue: Track[];
  onTrackOptions: (track: Track) => void;
  onMetaExtracted?: () => void;
}

function LocalTrackItem({
  track,
  index,
  colors,
  favoriteTracks,
  toggleFavorite,
  playTrack,
  localQueue,
  onTrackOptions,
  onMetaExtracted
}: LocalTrackItemProps) {
  const cachedMeta = localMetadataCache.get(track.uri);

  const [meta, setMeta] = useState<{ title: string; artist: string; album: string; artwork: string | null }>({
    title: cachedMeta?.title || track.filename.replace(/\.[^/.]+$/, ""),
    artist: cachedMeta?.artist || 'Local Audio',
    album: cachedMeta?.album || 'Local Album',
    artwork: cachedMeta?.artwork || (track.albumId ? `content://media/external/audio/albumart/${track.albumId}` : null)
  });

  useEffect(() => {
    if (localMetadataCache.has(track.uri)) return;

    let active = true;
    const loadMetadata = async () => {
      try {
        const result = await extractLocalMetadata(track.uri);
        if (result && active) {
          const data = {
            title: result.title || track.filename.replace(/\.[^/.]+$/, ""),
            artist: result.artist || 'Local Audio',
            album: result.album || 'Local Album',
            artwork: result.artwork || (track.albumId ? `content://media/external/audio/albumart/${track.albumId}` : null)
          };
          localMetadataCache.set(track.uri, data);
          setMeta(data);
          onMetaExtracted?.();
        }
      } catch (err) {
        // Fallback
      }
    };
    loadMetadata();
    return () => {
      active = false;
    };
  }, [track.uri, track.albumId]);

  const handlePlay = () => {
    const updatedTrack: Track = {
      ...localQueue[index],
      title: meta.title,
      artist: meta.artist,
      image: meta.artwork || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png'
    };

    const updatedQueue = [...localQueue];
    updatedQueue[index] = updatedTrack;

    playTrack(updatedTrack, updatedQueue);
  };

  const currentTrackId = localQueue[index]?.id || track.id;
  const isFavorited = favoriteTracks.includes(currentTrackId);

  return (
    <Pressable
      style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
      onPress={handlePlay}
    >
      <Image
        source={{ uri: meta.artwork || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png' }}
        style={styles.listItemArt}
        contentFit="cover"
      />
      <View style={{ flex: 1, gap: 2 }}>
        <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{meta.title}</RNText>
        <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{meta.artist}</RNText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite({
              ...localQueue[index],
              title: meta.title,
              artist: meta.artist,
              image: meta.artwork || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png'
            });
          }}
          style={{ padding: 4 }}
        >
          <AppIcon
            ios={isFavorited ? 'heart.fill' : 'heart'}
            android={isFavorited ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorited ? colors.accent : colors.textSecondary}
          />
        </Pressable>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onTrackOptions({
              ...localQueue[index],
              title: meta.title,
              artist: meta.artist,
              image: meta.artwork || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png'
            });
          }}
          style={styles.moreButton}
        >
          <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

// 🌟 Tab Restructuring: Removed 'Folders', Split into 'Artists' and 'Albums'
const tabs = ['Playlists', 'Songs', 'Artists', 'Albums'];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const router = useRouter();
  const playTrack = usePlaybackStore((state) => state.playTrack);
  const toggleFavorite = usePlaybackStore((state) => state.toggleFavorite);
  const favoriteTracks = usePlaybackStore((state) => state.favoriteTracks);
  
  const [activeTab, setActiveTab] = useState('Songs');
  const [localPlaylists, setLocalPlaylists] = useState<any[]>([]);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [renamePlaylistId, setRenamePlaylistId] = useState('');
  const [renamePlaylistName, setRenamePlaylistName] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isTrackOptionsVisible, setIsTrackOptionsVisible] = useState(false);

  // Search Header States
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [metaVersion, setMetaVersion] = useState(0);

  const nowPlayingPlaylist = usePlaybackStore((state) => state.nowPlayingPlaylist);
  const [ytLikedPlaylist, setYtLikedPlaylist] = useState<any>(null);
  const [isYTConnected, setIsYTConnected] = useState(false);

  // Scroll header animation variables
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);

  // Custom Hook for Local Audio Files
  const { audioFiles, permissionResponse, requestPermission, loading } = useLocalAudio();

  // Check YT connection and load Liked Playlist
  useEffect(() => {
    let active = true;
    const checkYTConnection = async () => {
      try {
        const cookies = await AsyncStorage.getItem('yt_cookies');
        const connected = !!cookies;
        if (active) setIsYTConnected(connected);
        
        if (connected) {
          const cached = await AsyncStorage.getItem('yt_liked_playlist');
          if (cached && active) {
            setYtLikedPlaylist(JSON.parse(cached));
          }
          const liveDetails = await InnerTubeClient.getPlaylistDetails('LM');
          if (liveDetails && active) {
            const parsedLiked = {
              id: 'LM',
              title: liveDetails.title || 'Liked Music',
              image: liveDetails.image,
              trackCount: liveDetails.songs?.length || liveDetails.trackCount || 0
            };
            setYtLikedPlaylist(parsedLiked);
            await AsyncStorage.setItem('yt_liked_playlist', JSON.stringify(parsedLiked));
          }
        } else {
          if (active) setYtLikedPlaylist(null);
        }
      } catch (err) {
        console.error("[Library] Error loading liked playlist:", err);
      }
    };
    
    checkYTConnection();
    return () => {
      active = false;
    };
  }, []);

  const fetchPlaylists = async () => {
    try {
      const rows = await getPlaylistsDB();
      setLocalPlaylists(rows);
    } catch (err) {
      console.error("Error fetching local playlists:", err);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [activeTab]);

  const handleCreatePlaylist = async () => {
    const trimmed = newPlaylistName.trim();
    if (!trimmed) {
      Alert.alert("Error", "Playlist name cannot be empty.");
      return;
    }
    const newId = await createPlaylistDB(trimmed);
    if (newId) {
      setNewPlaylistName('');
      setIsCreateModalVisible(false);
      fetchPlaylists();
    } else {
      Alert.alert("Error", "Failed to create playlist.");
    }
  };

  const handleRenamePlaylist = async () => {
    const trimmed = renamePlaylistName.trim();
    if (!trimmed) {
      Alert.alert("Error", "Playlist name cannot be empty.");
      return;
    }
    await renamePlaylistDB(renamePlaylistId, trimmed);
    setIsRenameModalVisible(false);
    fetchPlaylists();
  };

  const handleDeletePlaylist = (playlistId: string, name: string) => {
    Alert.alert(
      "Delete Playlist",
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePlaylistDB(playlistId);
            fetchPlaylists();
          }
        }
      ]
    );
  };

  const handlePlaylistOptions = (playlist: any) => {
    if (!playlist.id.startsWith('pl_')) {
      Alert.alert("Downloaded Playlist", "This playlist was downloaded from YouTube Music and cannot be managed locally.");
      return;
    }
    Alert.alert(
      "Playlist Options",
      `Manage playlist "${playlist.name}"`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rename",
          onPress: () => {
            setRenamePlaylistId(playlist.id);
            setRenamePlaylistName(playlist.name);
            setIsRenameModalVisible(true);
          }
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeletePlaylist(playlist.id, playlist.name)
        }
      ]
    );
  };

  // Base Queue for Zustand store
  const localQueue: Track[] = useMemo(() => {
    return audioFiles.map(track => {
      const cached = localMetadataCache.get(track.uri);
      return {
        id: track.id,
        title: cached?.title || track.filename.replace(/\.[^/.]+$/, ""),
        artist: cached?.artist || 'Local Audio',
        image: cached?.artwork || (track.albumId ? `content://media/external/audio/albumart/${track.albumId}` : 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png'),
        duration: track.duration,
        sourceType: 'local' as const,
        uri: track.uri
      };
    });
  }, [audioFiles, metaVersion]);

  // 🌟 Filtered Audio Files (Pure JS Filter for Songs Tab)
  const filteredAudioFiles = useMemo(() => {
    if (!searchQuery.trim()) return audioFiles;
    const q = searchQuery.toLowerCase().trim();
    return audioFiles.filter(track => {
      const cached = localMetadataCache.get(track.uri);
      const title = (cached?.title || track.filename.replace(/\.[^/.]+$/, "")).toLowerCase();
      const artist = (cached?.artist || 'Local Audio').toLowerCase();
      const album = (cached?.album || '').toLowerCase();
      return title.includes(q) || artist.includes(q) || album.includes(q);
    });
  }, [audioFiles, searchQuery, metaVersion]);

  // 🌟 Dynamic Grouping for Artists Tab
  const groupedArtists = useMemo(() => {
    const artistMap = new Map<string, { name: string; songs: Track[]; image: string | null }>();
    audioFiles.forEach(track => {
      const cached = localMetadataCache.get(track.uri);
      const artistName = cached?.artist || 'Local Audio';
      const art = cached?.artwork || (track.albumId ? `content://media/external/audio/albumart/${track.albumId}` : null);
      if (!artistMap.has(artistName)) {
        artistMap.set(artistName, { name: artistName, songs: [], image: art });
      }
      const group = artistMap.get(artistName)!;
      group.songs.push({
        id: track.id,
        title: cached?.title || track.filename.replace(/\.[^/.]+$/, ""),
        artist: artistName,
        image: art || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png',
        duration: track.duration,
        sourceType: 'local',
        uri: track.uri
      });
      if (!group.image && art) group.image = art;
    });

    let list = Array.from(artistMap.values());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a => a.name.toLowerCase().includes(q));
    }
    return list;
  }, [audioFiles, searchQuery, metaVersion]);

  // 🌟 Dynamic Grouping for Albums Tab
  const groupedAlbums = useMemo(() => {
    const albumMap = new Map<string, { name: string; artistName: string; songs: Track[]; image: string | null }>();
    audioFiles.forEach(track => {
      const cached = localMetadataCache.get(track.uri);
      const albumName = cached?.album || 'Local Album';
      const artistName = cached?.artist || 'Local Audio';
      const art = cached?.artwork || (track.albumId ? `content://media/external/audio/albumart/${track.albumId}` : null);
      if (!albumMap.has(albumName)) {
        albumMap.set(albumName, { name: albumName, artistName, songs: [], image: art });
      }
      const group = albumMap.get(albumName)!;
      group.songs.push({
        id: track.id,
        title: cached?.title || track.filename.replace(/\.[^/.]+$/, ""),
        artist: artistName,
        image: art || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png',
        duration: track.duration,
        sourceType: 'local',
        uri: track.uri
      });
      if (!group.image && art) group.image = art;
    });

    let list = Array.from(albumMap.values());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.artistName.toLowerCase().includes(q));
    }
    return list;
  }, [audioFiles, searchQuery, metaVersion]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentScrollY = event.contentOffset.y;
      const delta = currentScrollY - lastScrollY.value;
      const headerHeight = 48 + insets.top;

      if (currentScrollY <= 0) {
        headerTranslateY.value = 0;
      } else {
        headerTranslateY.value = Math.max(-headerHeight, Math.min(0, headerTranslateY.value - delta));
      }
      lastScrollY.value = currentScrollY;
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* 🌟 Header with Search Bar Toggle */}
      <AppHeader
        title="Your Library"
        headerTranslateY={headerTranslateY}
        showSearchIcon={true}
        isSearchActive={isSearchActive}
        onToggleSearch={setIsSearchActive}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchPlaceholder="Search songs, artists, albums..."
      />

      <Animated.ScrollView
        contentContainerStyle={[styles.contentContainer, { paddingTop: 48 + insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <View style={{ gap: 24 }}>
          {/* Quick Access Row */}
          <View style={styles.quickAccessRow}>
            <Pressable
              onPress={() => router.push('/collection?type=liked')}
              style={({ pressed }) => [
                styles.quickAccessCard,
                { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                pressed && styles.pressed
              ]}
            >
              <View style={[styles.quickAccessIconWrapper, { backgroundColor: 'rgba(255, 45, 85, 0.12)' }]}>
                <AppIcon ios="heart.fill" android="heart" size={22} color="#ff2d55" />
              </View>
              <View style={{ gap: 2 }}>
                <RNText style={[styles.quickAccessTitle, { color: colors.text }]}>Liked</RNText>
                <RNText style={[styles.quickAccessSubtitle, { color: colors.textSecondary }]}>Songs</RNText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push('/collection?type=downloads')}
              style={({ pressed }) => [
                styles.quickAccessCard,
                { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                pressed && styles.pressed
              ]}
            >
              <View style={[styles.quickAccessIconWrapper, { backgroundColor: 'rgba(52, 199, 89, 0.12)' }]}>
                <AppIcon ios="arrow.down.circle.fill" android="download" size={22} color="#34c759" />
              </View>
              <View style={{ gap: 2 }}>
                <RNText style={[styles.quickAccessTitle, { color: colors.text }]}>Downloads</RNText>
                <RNText style={[styles.quickAccessSubtitle, { color: colors.textSecondary }]}>Offline</RNText>
              </View>
            </Pressable>
          </View>

          {/* Material Top Tabs Navigation */}
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContainer}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[styles.tabButton, isActive && { borderBottomColor: colors.accent }]}
                  >
                    <RNText style={[
                      styles.tabButtonText,
                      { color: isActive ? colors.accent : colors.textSecondary }
                    ]}>
                      {tab}
                    </RNText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Tab Contents */}
          <View style={{ paddingHorizontal: 16, gap: 12 }}>

            {/* 🎵 SONGS TAB */}
            {activeTab === 'Songs' && (
              <View style={{ gap: 12 }}>
                {permissionResponse?.status !== 'granted' ? (
                  <View style={[styles.centerState, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
                    <RNText style={[styles.listItemTitle, { color: colors.text, marginBottom: 12 }]}>
                      We need access to your local music
                    </RNText>
                    <Pressable
                      style={[styles.permissionButton, { backgroundColor: colors.accent }]}
                      onPress={requestPermission}
                    >
                      <RNText style={styles.permissionButtonText}>Grant Storage Permission</RNText>
                    </Pressable>
                  </View>
                ) : loading ? (
                  <View style={[styles.centerState, { borderColor: 'transparent' }]}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary, marginTop: 12 }]}>
                      Scanning your device...
                    </RNText>
                  </View>
                ) : filteredAudioFiles.length === 0 ? (
                  <View style={[styles.centerState, { borderColor: 'transparent' }]}>
                    <RNText style={[styles.listItemTitle, { color: colors.textSecondary }]}>
                      {searchQuery.trim() ? `No songs found matching "${searchQuery}"` : 'No audio files found.'}
                    </RNText>
                  </View>
                ) : (
                  filteredAudioFiles.map((track, index) => (
                    <LocalTrackItem
                      key={track.id}
                      track={track}
                      index={index}
                      colors={colors}
                      favoriteTracks={favoriteTracks}
                      toggleFavorite={toggleFavorite}
                      playTrack={playTrack}
                      localQueue={localQueue}
                      onTrackOptions={(t) => {
                        setSelectedTrack(t);
                        setIsTrackOptionsVisible(true);
                      }}
                      onMetaExtracted={() => setMetaVersion(v => v + 1)}
                    />
                  ))
                )}
              </View>
            )}

            {/* 📑 PLAYLISTS TAB */}
            {activeTab === 'Playlists' && (
              <View style={{ gap: 12 }}>
                <Pressable
                  style={[
                    styles.listItem, 
                    { 
                      backgroundColor: colors.backgroundElement, 
                      borderStyle: 'dashed', 
                      borderWidth: 1, 
                      borderColor: colors.accent 
                    }
                  ]}
                  onPress={() => setIsCreateModalVisible(true)}
                >
                  <View style={[styles.folderIconWrapper, { backgroundColor: colors.audioIconBackground }]}>
                    <AppIcon ios="plus" android="add" size={22} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <RNText style={[styles.listItemTitle, { color: colors.accent, fontWeight: '700' }]} numberOfLines={1}>Create Playlist</RNText>
                    <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>Create a new custom playlist</RNText>
                  </View>
                </Pressable>

                {nowPlayingPlaylist || (isYTConnected && ytLikedPlaylist) || localPlaylists.length > 0 ? (
                  <>
                    {nowPlayingPlaylist && (
                      <Pressable
                        style={[
                          styles.listItem, 
                          { 
                            backgroundColor: colors.backgroundElement, 
                            borderColor: colors.accent, 
                            borderWidth: 1.5 
                          }
                        ]}
                        onPress={() => router.push(`/playlist?id=${nowPlayingPlaylist.id}`)}
                      >
                        {nowPlayingPlaylist.image ? (
                          <Image source={{ uri: nowPlayingPlaylist.image }} style={styles.listItemArt} contentFit="cover" />
                        ) : (
                          <View style={[styles.folderIconWrapper, { backgroundColor: colors.audioIconBackground }]}>
                            <AppIcon ios="music.note.list" android="musical-notes-outline" size={22} color={colors.accent} />
                          </View>
                        )}
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <RNText style={[styles.listItemTitle, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                              {nowPlayingPlaylist.name}
                            </RNText>
                            <View style={{ backgroundColor: colors.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                              <RNText style={{ fontSize: 9, color: '#fff', fontWeight: 'bold' }}>NOW PLAYING</RNText>
                            </View>
                          </View>
                          <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {nowPlayingPlaylist.type === 'online' ? 'YouTube Music Playlist' : 'Custom Playlist'}
                          </RNText>
                        </View>
                        <AppIcon ios="play.fill" android="play" size={18} color={colors.accent} />
                      </Pressable>
                    )}

                    {isYTConnected && ytLikedPlaylist && (
                      <Pressable
                        style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
                        onPress={() => router.push('/playlist?id=LM')}
                      >
                        {ytLikedPlaylist.image ? (
                          <Image source={{ uri: ytLikedPlaylist.image }} style={styles.listItemArt} contentFit="cover" />
                        ) : (
                          <View style={[styles.folderIconWrapper, { backgroundColor: 'rgba(255, 45, 85, 0.12)' }]}>
                            <AppIcon ios="heart.fill" android="heart" size={22} color="#ff2d55" />
                          </View>
                        )}
                        <View style={{ flex: 1, gap: 2 }}>
                          <RNText style={[styles.listItemTitle, { color: colors.text, fontWeight: '700' }]} numberOfLines={1}>
                            {ytLikedPlaylist.title}
                          </RNText>
                          <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            YouTube Music Liked Songs • {ytLikedPlaylist.trackCount} songs
                          </RNText>
                        </View>
                        <AppIcon ios="chevron.right" android="chevron-forward" size={18} color={colors.textSecondary} />
                      </Pressable>
                    )}

                    {localPlaylists.map((playlist) => (
                      <Pressable
                        key={playlist.id}
                        style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
                        onPress={() => router.push(`/playlist?id=${playlist.id}`)}
                      >
                        {playlist.image ? (
                          <Image source={{ uri: playlist.image }} style={styles.listItemArt} contentFit="cover" />
                        ) : (
                          <View style={[styles.folderIconWrapper, { backgroundColor: colors.audioIconBackground }]}>
                            <AppIcon ios="music.note.list" android="musical-notes-outline" size={22} color={colors.accent} />
                          </View>
                        )}
                        <View style={{ flex: 1, gap: 2 }}>
                          <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{playlist.name}</RNText>
                          <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {playlist.id.startsWith('pl_') ? 'Custom Playlist' : 'Downloaded Playlist'}
                          </RNText>
                        </View>
                        <Pressable 
                          onPress={(e) => {
                            e.stopPropagation();
                            handlePlaylistOptions(playlist);
                          }} 
                          style={styles.moreButton}
                        >
                          <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.textSecondary} />
                        </Pressable>
                      </Pressable>
                    ))}
                  </>
                ) : (
                  <View style={[styles.centerState, { borderColor: 'transparent' }]}>
                    <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]}>
                      No playlists created or downloaded yet.
                    </RNText>
                  </View>
                )}
              </View>
            )}

            {/* 🎤 ARTISTS TAB */}
            {activeTab === 'Artists' && (
              <View style={{ gap: 12 }}>
                {groupedArtists.length === 0 ? (
                  <View style={[styles.centerState, { borderColor: 'transparent' }]}>
                    <RNText style={[styles.listItemTitle, { color: colors.textSecondary }]}>
                      {searchQuery.trim() ? `No artists found matching "${searchQuery}"` : 'No local artists found.'}
                    </RNText>
                  </View>
                ) : (
                  groupedArtists.map((artist) => (
                    <Pressable
                      key={artist.name}
                      style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
                      onPress={() => {
                        if (artist.songs.length > 0) {
                          playTrack(artist.songs[0], artist.songs);
                        }
                      }}
                    >
                      <Image
                        source={{ uri: artist.image || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png' }}
                        style={styles.listItemArtRound}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{artist.name}</RNText>
                        <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                          {artist.songs.length} {artist.songs.length === 1 ? 'song' : 'songs'}
                        </RNText>
                      </View>
                      <AppIcon ios="play.fill" android="play" size={18} color={colors.accent} />
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {/* 💿 ALBUMS TAB */}
            {activeTab === 'Albums' && (
              <View style={{ gap: 12 }}>
                {groupedAlbums.length === 0 ? (
                  <View style={[styles.centerState, { borderColor: 'transparent' }]}>
                    <RNText style={[styles.listItemTitle, { color: colors.textSecondary }]}>
                      {searchQuery.trim() ? `No albums found matching "${searchQuery}"` : 'No local albums found.'}
                    </RNText>
                  </View>
                ) : (
                  groupedAlbums.map((album) => (
                    <Pressable
                      key={album.name}
                      style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
                      onPress={() => {
                        if (album.songs.length > 0) {
                          playTrack(album.songs[0], album.songs);
                        }
                      }}
                    >
                      <Image
                        source={{ uri: album.image || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png' }}
                        style={styles.listItemArt}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{album.name}</RNText>
                        <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                          {album.artistName} • {album.songs.length} {album.songs.length === 1 ? 'song' : 'songs'}
                        </RNText>
                      </View>
                      <AppIcon ios="play.fill" android="play" size={18} color={colors.accent} />
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={{ height: 96 }} />
        </View>
      </Animated.ScrollView>

      {/* 🌟 FAB: Attached directly to Create Playlist Modal Trigger */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.accent },
          pressed && styles.pressed
        ]}
        onPress={() => setIsCreateModalVisible(true)}
      >
        <AppIcon
          ios="plus"
          android="add"
          size={24}
          color={colors.playIconColor}
        />
      </Pressable>

      {/* Create Playlist Modal */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
            <RNText style={[styles.modalTitle, { color: colors.text }]}>New Playlist</RNText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder="Enter playlist name..."
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setIsCreateModalVisible(false)}
                style={[styles.modalButton, { borderColor: colors.cardBorder, borderWidth: 1 }]}
              >
                <RNText style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</RNText>
              </Pressable>
              <Pressable
                onPress={handleCreatePlaylist}
                style={[styles.modalButton, { backgroundColor: colors.accent }]}
              >
                <RNText style={{ color: '#fff', fontWeight: '700' }}>Create</RNText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rename Playlist Modal */}
      <Modal
        visible={isRenameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
            <RNText style={[styles.modalTitle, { color: colors.text }]}>Rename Playlist</RNText>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
              value={renamePlaylistName}
              onChangeText={setRenamePlaylistName}
              placeholder="Enter new name..."
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setIsRenameModalVisible(false)}
                style={[styles.modalButton, { borderColor: colors.cardBorder, borderWidth: 1 }]}
              >
                <RNText style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</RNText>
              </Pressable>
              <Pressable
                onPress={handleRenamePlaylist}
                style={[styles.modalButton, { backgroundColor: colors.accent }]}
              >
                <RNText style={{ color: '#fff', fontWeight: '700' }}>Save</RNText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Track Options Bottom Sheet */}
      <TrackOptionsSheet
        isVisible={isTrackOptionsVisible}
        onClose={() => setIsTrackOptionsVisible(false)}
        track={selectedTrack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingTop: 0, paddingBottom: 16 },
  pressed: { opacity: 0.7 },
  tabsContainer: { paddingHorizontal: 16, gap: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.05)' },
  tabButton: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonText: { fontSize: 15, fontWeight: '600' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, width: screenWidth - 32, gap: 12 },
  listItemArt: { width: 48, height: 48, borderRadius: 8 },
  listItemArtRound: { width: 48, height: 48, borderRadius: 24 },
  folderIconWrapper: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  listItemTitle: { fontSize: 15, fontWeight: '600' },
  listItemSubtitle: { fontSize: 13 },
  moreButton: { padding: 4 },
  quickAccessRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  quickAccessCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  quickAccessIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  quickAccessTitle: { fontSize: 14, fontWeight: '700' },
  quickAccessSubtitle: { fontSize: 12 },
  centerState: { padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  permissionButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  permissionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 20,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 340, padding: 20, borderRadius: 16, borderWidth: 1, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalInput: { height: 44, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }
});