import React, { useState, useEffect, useRef } from 'react';
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
import MiniPlayer from '@/components/mini-player';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { InnerTubeClient } from '@/services/InnerTubeClient';

const { width: screenWidth } = Dimensions.get('window');

// Baqi dummy data wese hi rakha hai for other tabs
const playlists = [
  { id: '1', title: 'My Favorites', subtitle: '24 songs', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrCPHRwyp_exPi9aDDdnJ8cL97H2-4KSYTswpEv8S2cFZYZ9Kfk7UK7hu_-ljzpYgyEkPhUfM4FYFeqDCB6-tqDeS4mhI85_QTgElSmwF49Twp7KpDY1dqPG28TeUxFAHKDDqCDB9wzaoAWNmDSmbzCs6puvxBeD24yjt8c2Gfh1HZn1n4-fdWTaVsUsTflwtfmXXKWdEDVtfHkt0AO_Za6oiMlvZGVEyaJKpk8k8zvK-lcE-m9396UYCvdOqdkXOH7rjnmg7WOOyC' },
  { id: '2', title: 'Gym Tracks', subtitle: '12 songs', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJ6DODbRup1lG5P4VqPimqTj1kp6maPwlFe2aa5d3wgOl2gZPUW5PMD9nB5HkWJe9wX4IzBCUZDdeMMGqzCm9eCQcJ7z8Xcxt1wf4UE1vWdG__JE3mFQ15kTM-HulJnqBJsrMWf4EMH-gLnzuMX9wCI_6H7UuoD0UDpGuGJGatKs0KYDtYetBvkEiup9ppjqklyxVFyCf1DN01pNImN_TonFmW-A94PM5engwudFlkZfg6z31r55BTN2DY7tRUgF9CZIiZ5X902-P7' },
  { id: '3', title: 'Lofi Beats', subtitle: '35 songs', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPLnXCW7m2-veRxMrx1GIDLYFiF2OSblr8PUz1fmCfovonespXMtltgr01YToIKoIxFUi-01iM1nk7LEiStAgH9ULUQjD6fVl8_hDz4nH2NByTl5QWiqFUdlWEAa3qCr9DdNAgtZWXupykOXgAqm6RSqgjCXEABoCPG6DRHPHekgwxSHHXPuIPZ3CwakLyuO1foVdYVcMVrdkVMHZ0s0mOE26MdV15ZaigTjOlXC3HDrqdQwlFTRBfG5SelLCuduPjf4KMEnRCmUpN' }
];

const artists = [
  { id: '1', title: 'M83', subtitle: '1 album • 12 songs', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfDQPHqfdMWlnSFtNGjCGU2tsWf_TpMUmYCWaSEAj5TsUK_i9A7JdDXSjHiPVmzRTUf5lfxN7qDA7Xc6SEbew2B40CWecdj5gCSFA8mLnPkNUuisIyCEuypQdDUNMaN_tjacAB2opATgHvFuoepOiAdu9gFMvsxhPyxA3QrOINSuch9Xol67oCmpM90EbKwTvcvj1peKsrojgjZpfCxeeMlBnf91TtHn9hudRUOIyVCIeLGPT8Z3vwIcfEVKG41F01pHVVpVK6W2ho' },
  { id: '2', title: 'The Weeknd', subtitle: '2 albums • 28 songs', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuPNB6gYmZ4ytE_AY-ngGfpJczbo_AZRaq-nSEZpfSmv18XSj7cbomjV0l7KSax6nYlG5yGJT6varZ4CR3wUCTMHPWI1ZmxwzcXkBeHdGf4GX39-UafNS6a0D-vQVS2AltRUwbP47WlYWsIZtGju95yp7y7p-kleMTfm5zRIjc6dGEJHqcU_BgDlf6cq8isCOaFqFf27Cp0yYdUqwy4f7oBecRo8A2pTqiVxx30a8JjL46kmiAQn2urMbWK_flA2nV7V6qtdSXkICVo' }
];

const folders = [
  { id: '1', title: 'Download', subtitle: '18 audio files • /storage/emulated/0/Download' },
  { id: '2', title: 'Music', subtitle: '45 audio files • /storage/emulated/0/Music' }
];

interface LocalTrackItemProps {
  track: any;
  index: number;
  colors: any;
  favoriteTracks: string[];
  toggleFavorite: (track: Track) => void;
  playTrack: (track: Track, newQueue: Track[]) => void;
  localQueue: Track[];
  onTrackOptions: (track: Track) => void;
}

function LocalTrackItem({
  track,
  index,
  colors,
  favoriteTracks,
  toggleFavorite,
  playTrack,
  localQueue,
  onTrackOptions
}: LocalTrackItemProps) {
  const [meta, setMeta] = useState<{ title: string; artist: string; artwork: string | null }>({
    title: track.filename.replace(/\.[^/.]+$/, ""),
    artist: 'Local Audio',
    artwork: track.albumId ? `content://media/external/audio/albumart/${track.albumId}` : null
  });

  useEffect(() => {
    let active = true;
    const loadMetadata = async () => {
      try {
        const result = await extractLocalMetadata(track.uri);
        if (result && active) {
          setMeta({
            title: result.title || track.filename.replace(/\.[^/.]+$/, ""),
            artist: result.artist || 'Local Audio',
            artwork: result.artwork || (track.albumId ? `content://media/external/audio/albumart/${track.albumId}` : null)
          });
        }
      } catch (err) {
        // Fallback to default
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

  const currentTrackId = localQueue[index].id;
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

const tabs = ['Playlists', 'Songs', 'Artists & Albums', 'Folders'];

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

  const nowPlayingPlaylist = usePlaybackStore((state) => state.nowPlayingPlaylist);
  const [ytLikedPlaylist, setYtLikedPlaylist] = useState<any>(null);
  const [isYTConnected, setIsYTConnected] = useState(false);

  // Scroll header animation variables
  const lastScrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const headerHeight = 48 + insets.top;
    return {
      transform: [{ translateY: headerTranslateY.value }],
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: headerHeight,
      paddingTop: insets.top,
      backgroundColor: colors.background,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      zIndex: 10,
    };
  });

  // Check YT connection and load Liked Playlist
  useEffect(() => {
    let active = true;
    const checkYTConnection = async () => {
      try {
        const cookies = await AsyncStorage.getItem('yt_cookies');
        const connected = !!cookies;
        if (active) setIsYTConnected(connected);
        
        if (connected) {
          // 1. Load cached liked playlist metadata
          const cached = await AsyncStorage.getItem('yt_liked_playlist');
          if (cached && active) {
            setYtLikedPlaylist(JSON.parse(cached));
          }
          // 2. Fetch live Liked Playlist details
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

  // Custom Hook use kar liya
  const { audioFiles, permissionResponse, requestPermission, loading } = useLocalAudio();

  // Helper function to format duration (seconds to mm:ss)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Queue banane ka logic (Zustand store ke liye)
  const localQueue: Track[] = audioFiles.map(track => ({
    id: track.id,
    title: track.filename.replace(/\.[^/.]+$/, ""),
    artist: 'Local Audio',
    image: track.albumId ? `content://media/external/audio/albumart/${track.albumId}` : 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png',
    duration: track.duration,
    sourceType: 'local' as const,
    uri: track.uri
  }));

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
      
      {/* Animated Header */}
      <Animated.View style={animatedHeaderStyle}>
        <RNText style={[styles.headerTitle, { color: colors.text }]}>Your Library</RNText>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [
            styles.profileButton,
            { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
            pressed && styles.pressed
          ]}
        >
          <AppIcon
            ios="person.crop.circle.fill"
            android="person-circle"
            size={28}
            color={colors.accent}
          />
        </Pressable>
      </Animated.View>

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

            {/* Real Data Integrated Here */}
            {activeTab === 'Songs' && (
              <View style={{ gap: 12 }}>
                {permissionResponse?.status !== 'granted' ? (
                  // Permission Request UI
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
                  // Loading State
                  <View style={[styles.centerState, { borderColor: 'transparent' }]}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary, marginTop: 12 }]}>
                      Scanning your device...
                    </RNText>
                  </View>
                ) : audioFiles.length === 0 ? (
                  // Empty State
                  <View style={[styles.centerState, { borderColor: 'transparent' }]}>
                    <RNText style={[styles.listItemTitle, { color: colors.textSecondary }]}>
                      No audio files found.
                    </RNText>
                  </View>
                ) : (
                  // Mapping Real Audio Files
                  audioFiles.map((track, index) => (
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
                    />
                  ))
                )}
              </View>
            )}

            {/* Baqi Tabs Code Wese Hi Hai */}
            {activeTab === 'Playlists' && (
              <View style={{ gap: 12 }}>
                {/* "+ Create Playlist" Button Row */}
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
                    {/* 🌟 NOW PLAYING PLAYLIST CARD */}
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

                    {/* 🌟 YT LIKED PLAYLIST CARD */}
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

                    {/* LOCAL PLAYLISTS */}
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

            {activeTab === 'Artists & Albums' && (
              <View style={{ gap: 12 }}>
                {artists.map((artist) => (
                  <Pressable
                    key={artist.id}
                    style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
                    onPress={() => alert(`Opening details for artist: ${artist.title}`)}
                  >
                    <Image source={{ uri: artist.image }} style={styles.listItemArtRound} contentFit="cover" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{artist.title}</RNText>
                      <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{artist.subtitle}</RNText>
                    </View>
                    <Pressable onPress={() => alert(`Options for artist: ${artist.title}`)} style={styles.moreButton}>
                      <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}

            {activeTab === 'Folders' && (
              <View style={{ gap: 12 }}>
                {folders.map((folder) => (
                  <Pressable
                    key={folder.id}
                    style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
                    onPress={() => alert(`Opening folder: ${folder.title}`)}
                  >
                    <View style={[styles.folderIconWrapper, { backgroundColor: colors.audioIconBackground }]}>
                      <AppIcon ios="folder" android="folder" size={22} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{folder.title}</RNText>
                      <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{folder.subtitle}</RNText>
                    </View>
                    <Pressable onPress={() => alert(`Options for folder: ${folder.title}`)} style={styles.moreButton}>
                      <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={{ height: 96 }} />
        </View>
      </Animated.ScrollView>

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.accent },
          pressed && styles.pressed
        ]}
        onPress={() => alert('Add to Library options')}
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
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingTop: 0, paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  profileButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  pressed: { opacity: 0.7 },
  storageLabel: { fontSize: 12, fontWeight: '500' },
  storageFree: { fontSize: 12, fontWeight: '600' },
  storageBarBg: { height: 4, borderRadius: 2, width: '100%', overflow: 'hidden' },
  storageBarFill: { height: '100%', borderRadius: 2 },
  tabsContainer: { paddingHorizontal: 16, gap: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(0, 0, 0, 0.05)' },
  tabButton: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonText: { fontSize: 15, fontWeight: '600' },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, width: screenWidth - 32, gap: 12 },
  listItemArt: { width: 48, height: 48, borderRadius: 8 },
  listItemArtRound: { width: 48, height: 48, borderRadius: 24 },
  folderIconWrapper: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  listItemTitle: { fontSize: 15, fontWeight: '600' },
  listItemSubtitle: { fontSize: 12 },
  moreButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  fab: { position: 'absolute', bottom: 84, right: 16, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 4, zIndex: 90 },

  // Naye styles Permission aur Loading state ke liye
  centerState: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  permissionButtonText: {
    color: '#000', // Assuming accent is bright (like Spotify green), dark text works best. Change to white if needed.
    fontWeight: '700',
  },
  quickAccessRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickAccessCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  quickAccessIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAccessTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  quickAccessSubtitle: {
    fontSize: 11,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: screenWidth - 64, padding: 24, borderRadius: 16, borderWidth: 1, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  modalButtons: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 4 },
  modalButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});