import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Pressable, Dimensions, Text as RNText, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore, Track } from '@/store/usePlaybackStore';
import MiniPlayer from '@/components/mini-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { InnerTubeClient } from '@/services/InnerTubeClient';

const { width: screenWidth } = Dimensions.get('window');

interface HomeShelfItem {
  id: string;
  title: string;
  artist: string;
  image: string;
  duration?: number;
  sourceType: 'youtube';
  itemType: 'track' | 'playlist' | 'album' | 'artist';
}

interface HomeShelf {
  title: string;
  items: HomeShelfItem[];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const playTrack = usePlaybackStore((state) => state.playTrack);
  const router = useRouter();

  // API States
  const [homeData, setHomeData] = useState({
    isLoggedIn: false,
    trending: [] as any[],
    newReleases: [] as any[],
    globalHits: [] as any[],
    regionalHits: [] as any[],
    chartsPlaylists: [] as any[],
    countryName: '' as string,
    topTracks: [] as any[],
    shelves: [] as HomeShelf[],
    likedPlaylist: null as any
  });
  const [showSpeedDial, setShowSpeedDial] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 🌟 REF TO PREVENT STALE CLOSURES IN FOCUS EFFECT
  const homeDataRef = useRef(homeData);
  useEffect(() => {
    homeDataRef.current = homeData;
  }, [homeData]);

  // Fetch Data on Focus / Mount
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchHomeData = async () => {
        try {
          // Read Speed Dial Setting
          const showSpeedDialVal = await AsyncStorage.getItem('settings_show_speed_dial');
          if (showSpeedDialVal !== null && isMounted) {
            setShowSpeedDial(showSpeedDialVal === 'true');
          }

          const currentHomeData = homeDataRef.current;
          const cookies = await AsyncStorage.getItem('yt_cookies');
          const isUserConnected = !!cookies;
          const wasUserConnected = currentHomeData.isLoggedIn;

          // If we already have data in memory and the connection status didn't change, skip fetching
          const hasData = currentHomeData.shelves.length > 0 || currentHomeData.trending.length > 0 || currentHomeData.newReleases.length > 0;
          if (hasData && isUserConnected === wasUserConnected) {
            console.log("[HomeScreen] Skipped API fetch: data is cached and connection status has not changed.");
            if (isMounted) setIsLoading(false);
            return;
          }

          console.log("[HomeScreen] Fetching home screen data client-side...");
          const data = await InnerTubeClient.getHomeData();
          if (isMounted) {
            setHomeData({
              isLoggedIn: data.isLoggedIn || false,
              trending: data.trending || [],
              newReleases: data.newReleases || [],
              globalHits: data.globalHits || [],
              regionalHits: data.regionalHits || [],
              chartsPlaylists: data.chartsPlaylists || [],
              countryName: data.countryName || '',
              topTracks: data.topTracks || [],
              shelves: data.shelves || [],
              likedPlaylist: data.likedPlaylist || null
            });
            setContinuationToken(data.continuationToken || null);
          }
        } catch (error) {
          console.error("Home Data Fetch Error:", error);
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      fetchHomeData();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const greeting = (() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return 'Good Morning';
    else if (hours >= 12 && hours < 17) return 'Good Afternoon';
    else return 'Good Evening';
  })();

  // Play Track Wrapper (Loading Spinner dikhane ke liye)
  const handlePlay = async (track: any, queueData: any[]) => {
    if (!track || !track.id) return;
    setLoadingTrackId(track.id);

    try {
      // UI data ko Zustand Track format mein map kar rahe hain
      const newTrack: Track = {
        id: track.id,
        title: track.title || 'Unknown Song',
        artist: track.artist || 'Unknown Artist',
        image: track.image || '',
        duration: track.duration || 0,
        sourceType: 'youtube',
        uri: '' // Store khud fetch karega
      };

      const queue: Track[] = queueData
        .filter(r => r !== null && r !== undefined && r.id)
        .map(r => ({
          id: r.id,
          title: r.title || 'Unknown Song',
          artist: r.artist || 'Unknown Artist',
          image: r.image || '',
          duration: r.duration || 0,
          sourceType: 'youtube',
          uri: ''
        }));

      // playTrack ab promise hai, isliye await kar rahe hain
      await playTrack(newTrack, queue);
    } catch (err) {
      console.error("Error playing track on Home:", err);
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handlePlayPlaylistOrTrack = async (item: any, fallbackQueue: any[]) => {
    if (!item || !item.id) return;
    const isPlaylist = item.itemType === 'playlist' || item.itemType === 'album' || item.id.startsWith('VLPL') || item.id.startsWith('PL');

    setLoadingTrackId(item.id);
    try {
      if (isPlaylist) {
        console.log(`[HomeScreen] Fetching playlist tracks for playback: ${item.title}`);
        const playlistDetails = await InnerTubeClient.getPlaylistDetails(item.id);
        if (playlistDetails && playlistDetails.songs && playlistDetails.songs.length > 0) {
          await handlePlay(playlistDetails.songs[0], playlistDetails.songs);
        } else {
          Alert.alert("Play Playlist", "No playable tracks found in this playlist.");
        }
      } else {
        await handlePlay(item, fallbackQueue);
      }
    } catch (err) {
      console.error("[HomeScreen] handlePlayPlaylistOrTrack error:", err);
      Alert.alert("Error", "Failed to play item.");
    } finally {
      setLoadingTrackId(null);
    }
  };

  const chunkKeepListening = (items: any[]) => {
    const row1: any[] = [];
    const row2: any[] = [];
    items.forEach((item, idx) => {
      if (idx % 2 === 0) row1.push(item);
      else row2.push(item);
    });
    return { row1, row2 };
  };

  const renderLikedCover = (images: string[]) => {
    if (!images || images.length === 0) {
      return <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png' }} style={styles.likedCoverGrid} contentFit="cover" />;
    }
    if (images.length < 4) {
      return <Image source={{ uri: images[0] }} style={styles.likedCoverGrid} contentFit="cover" />;
    }
    return (
      <View style={styles.likedCoverGrid}>
        {images.slice(0, 4).map((img, i) => (
          <Image key={i} source={{ uri: img }} style={styles.gridCoverImage} contentFit="cover" />
        ))}
      </View>
    );
  };

  const renderNormalCard = (item: any, queue: any[], keyPrefix: string) => {
    if (!item || !item.id) return null;
    const isPlayable = item.itemType === 'track';
    const isArtist = item.itemType === 'artist';
    const title = typeof item.title === 'string' ? item.title : String(item.title || 'Unknown');
    const artist = typeof item.artist === 'string' ? item.artist : String(item.artist || '');

    return (
      <Pressable
        key={`card-${item.id}-${keyPrefix}`}
        style={[isArtist ? styles.artistCard : styles.trendingCard, { gap: 8 }]}
        onPress={() => {
          if (isPlayable) {
            handlePlay(item, queue);
          } else if (isArtist) {
            router.push(`/artist?id=${item.id}`);
          } else {
            router.push(`/playlist?id=${item.id}`);
          }
        }}
      >
        <View style={[
          isArtist ? styles.artistImageContainer : styles.cardImageContainer,
          { backgroundColor: colors.backgroundElement, position: 'relative' }
        ]}>
          <Image source={{ uri: item.image }} style={isArtist ? styles.artistImage : styles.cardImage} contentFit="cover" />
          {isPlayable && loadingTrackId === item.id && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>
        <View style={{ gap: 2, alignItems: isArtist ? 'center' : 'flex-start' }}>
          <RNText style={[styles.songTitle, { color: colors.text, textAlign: isArtist ? 'center' : 'left' }]} numberOfLines={1}>{title}</RNText>
          {!isArtist && (
            <RNText style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>{artist}</RNText>
          )}
        </View>
      </Pressable>
    );
  };

  const handlePlayRandomMusic = () => {
    const allTracks: any[] = [];
    homeData.shelves.forEach(shelf => {
      shelf.items.forEach(item => {
        if (item.itemType === 'track') {
          allTracks.push(item);
        }
      });
    });

    if (allTracks.length > 0) {
      const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
      handlePlay(randomTrack, allTracks);
    } else {
      Alert.alert("Play Random", "No online tracks found on home screen to play randomly.");
    }
  };

  const loadMoreShelves = async () => {
    if (isLoadingMore || !continuationToken) return;
    setIsLoadingMore(true);
    console.log('[Home] Loading more shelves...');
    try {
      const res = await InnerTubeClient.getHomeContinuation(continuationToken);
      if (res.shelves.length > 0) {
        setHomeData(prev => ({
          ...prev,
          shelves: [...prev.shelves, ...res.shelves]
        }));
      }
      setContinuationToken(res.continuationToken);
    } catch (err) {
      console.error('[Home] Failed to load more shelves:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <RNText style={{ color: colors.textSecondary, marginTop: 16 }}>Loading your music...</RNText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          const isCloseToBottom = nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 400;
          if (isCloseToBottom) {
            loadMoreShelves();
          }
        }}
      >
        <View style={{ gap: 24 }}>

          {/* Header: Greeting & Profile */}
          <View style={[styles.header, { width: screenWidth - 32, marginHorizontal: 16 }]}>
            <View style={{ gap: 2 }}>
              <RNText style={[styles.headerTitle, { color: colors.text }]}>{greeting}</RNText>
              {homeData.isLoggedIn && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#34c759' }} />
                  <RNText style={{ fontSize: 12, color: colors.textSecondary }}>Personalized Feed</RNText>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => alert('Profile Details')}
              style={({ pressed }) => [
                styles.profileButton,
                { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                pressed && styles.pressed
              ]}
            >
              <AppIcon ios="person.crop.circle.fill" android="person-circle" size={28} color={colors.accent} />
            </Pressable>
          </View>
          {(() => {
            const speedDialShelf = homeData.shelves.find(s => {
              const t = (s?.title || '').toLowerCase();
              return t.includes('speed dial') || t.includes('listen again') || t.includes('quick picks');
            });
            const otherShelves = homeData.shelves.filter(s => {
              const t = (s?.title || '').toLowerCase();
              return !t.includes('speed dial') && !t.includes('listen again') && !t.includes('quick picks');
            });

            return (
              <View style={{ gap: 24 }}>
                {/* ── SECTION A: Speed dial ── */}
                {showSpeedDial && speedDialShelf && (
                  <View style={{ gap: 12, paddingHorizontal: 16 }}>
                    <RNText style={[styles.sectionTitle, { color: colors.text }]}>{speedDialShelf.title}</RNText>
                    <View style={styles.speedDialGrid}>
                      {speedDialShelf.items.slice(0, 8).map((item, idx) => {
                        const isPlayable = item.itemType === 'track';
                        return (
                          <Pressable
                            key={`sd-${item.id}-${idx}`}
                            onPress={() => {
                              if (isPlayable) {
                                handlePlay(item, speedDialShelf.items);
                              } else if (item.itemType === 'artist') {
                                router.push(`/artist?id=${item.id}`);
                              } else {
                                router.push(`/playlist?id=${item.id}`);
                              }
                            }}
                            style={({ pressed }) => [styles.speedDialCard, pressed && styles.pressed]}
                          >
                            <Image source={{ uri: item.image }} style={styles.speedDialImage} contentFit="cover" />
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.65)']}
                              style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.speedDialTextContainer}>
                              <RNText style={styles.speedDialText} numberOfLines={2}>{item.title}</RNText>
                            </View>
                          </Pressable>
                        );
                      })}
                      {/* 9th block: 5 dots dice button */}
                      <Pressable
                        onPress={handlePlayRandomMusic}
                        style={({ pressed }) => [
                          styles.speedDialCard,
                          styles.speedDialDotsCard,
                          { backgroundColor: colors.backgroundElement },
                          pressed && styles.pressed
                        ]}
                      >
                        <View style={styles.dotsContainer}>
                          <View style={styles.dotsRow}>
                            <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
                            <View style={{ width: 8 }} />
                            <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
                          </View>
                          <View style={[styles.dot, { backgroundColor: colors.textSecondary, marginVertical: 6 }]} />
                          <View style={styles.dotsRow}>
                            <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
                            <View style={{ width: 8 }} />
                            <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
                          </View>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* ── SECTION B: Your Playlists / Featured Charts ── */}
                {homeData.likedPlaylist ? (
                  <View style={{ gap: 12, paddingHorizontal: 16 }}>
                    <View style={styles.resultsSectionHeader}>
                      <View style={{ gap: 2 }}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Your YouTube playlists</RNText>
                        <RNText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Personal Library</RNText>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => router.push(`/playlist?id=LM`)}
                      style={({ pressed }) => [
                        styles.likedCardContainer,
                        { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                        pressed && styles.pressed
                      ]}
                    >
                      {renderLikedCover(homeData.likedPlaylist.images)}
                      <View style={styles.likedCardInfo}>
                        <RNText style={[styles.likedCardTitle, { color: colors.text }]} numberOfLines={1}>
                          {homeData.likedPlaylist.title}
                        </RNText>
                        <RNText style={[styles.likedCardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                          {homeData.likedPlaylist.trackCount} songs • {homeData.likedPlaylist.description}
                        </RNText>
                      </View>
                      <View style={styles.likedPlayIconWrapper}>
                        <AppIcon ios="play.fill" android="play" size={16} color={colors.text} />
                      </View>
                    </Pressable>
                  </View>
                ) : (
                  homeData.chartsPlaylists && homeData.chartsPlaylists.length > 0 && (
                    <View style={{ gap: 12 }}>
                      <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>Featured Charts</RNText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                          {homeData.chartsPlaylists.map((playlist, idx) => {
                            const isPurple = idx % 3 === 0;
                            const isCyan = idx % 3 === 1;
                            const cardBg = isPurple ? styles.chartCardPurple : (isCyan ? styles.chartCardCyan : styles.chartCardOrange);
                            return (
                              <Pressable
                                key={playlist.id || `charts-pl-${idx}`}
                                style={[cardBg, { flexDirection: 'row', alignItems: 'center' }]}
                                onPress={() => router.push(`/playlist?id=${playlist.id}`)}
                              >
                                <View style={{ flex: 1, justifyContent: 'flex-end', height: '100%', gap: 4 }}>
                                  <RNText style={styles.chartTitle} numberOfLines={2}>{playlist.title}</RNText>
                                  <RNText style={styles.chartSubtitle} numberOfLines={1}>{playlist.artist || 'YouTube Music'}</RNText>
                                </View>
                                {playlist.image ? (
                                  <Image source={{ uri: playlist.image }} style={styles.chartMiniImage} contentFit="cover" />
                                ) : (
                                  <View style={styles.chartIconContainer}>
                                    <AppIcon ios="chart.bar.xaxis" android="bar-chart" size={56} color="#ffffff" />
                                  </View>
                                )}
                              </Pressable>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>
                  )
                )}

                {/* ── SECTION C: Other shelves ── */}
                {otherShelves.map((shelf, shelfIdx) => {
                  try {
                    if (!shelf || !shelf.items || shelf.items.length === 0) return null;

                    const titleLower = (typeof shelf.title === 'string' ? shelf.title : '').toLowerCase();
                    const shelfTitle = typeof shelf.title === 'string' ? shelf.title : String(shelf.title || '');
                    const isKeepListening = titleLower.includes('keep listening');
                    const isMoods = titleLower.includes('moods') || titleLower.includes('genre');
                    const isCommunity = titleLower.includes('community');

                    if (isKeepListening) {
                      const chunked = chunkKeepListening(shelf.items);
                      return (
                        <View key={`shelf-kl-${shelfIdx}`} style={{ gap: 12 }}>
                          <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>
                            {shelfTitle}
                          </RNText>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={[styles.horizontalRow, { flexDirection: 'column', gap: 12, paddingBottom: 8 }]}>
                              <View style={{ flexDirection: 'row', gap: 16 }}>
                                {chunked.row1.filter(i => !!i).map((item, idx) => renderNormalCard(item, shelf.items, `kl-r1-${idx}`))}
                              </View>
                              <View style={{ flexDirection: 'row', gap: 16 }}>
                                {chunked.row2.filter(i => !!i).map((item, idx) => renderNormalCard(item, shelf.items, `kl-r2-${idx}`))}
                              </View>
                            </View>
                          </ScrollView>
                        </View>
                      );
                    }

                    if (isMoods) {
                      return (
                        <View key={`shelf-moods-${shelfIdx}`} style={{ gap: 12, paddingHorizontal: 16 }}>
                          <RNText style={[styles.sectionTitle, { color: colors.text }]}>
                            {shelfTitle}
                          </RNText>
                          <View style={styles.moodsGrid}>
                            {shelf.items.filter((item: any) => !!item && !!item.id).slice(0, 8).map((item, idx) => (
                              <Pressable
                                key={`mood-${shelfIdx}-${idx}`}
                                onPress={() => router.push(`/search?q=${encodeURIComponent(String(item.title || ''))}`)}
                                style={({ pressed }) => [
                                  styles.moodPill,
                                  { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                                  pressed && styles.pressed
                                ]}
                              >
                                <RNText style={[styles.moodText, { color: colors.text }]} numberOfLines={1}>
                                  {String(item.title || '')}
                                </RNText>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      );
                    }

                    if (isCommunity) {
                      return (
                        <View key={`shelf-comm-${shelfIdx}`} style={{ gap: 12, paddingHorizontal: 16 }}>
                          <RNText style={[styles.sectionTitle, { color: colors.text }]}>
                            {shelfTitle}
                          </RNText>
                          <View style={[styles.communityContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
                            <View style={styles.communitySongsList}>
                              {shelf.items.slice(0, 4).map((item, idx) => (
                                <Pressable
                                  key={`comm-${item?.id ?? idx}-${idx}`}
                                  onPress={() => {
                                    if (item.itemType === 'track') {
                                      handlePlay(item, shelf.items);
                                    } else {
                                      router.push(`/playlist?id=${item.id}`);
                                    }
                                  }}
                                  style={styles.communitySongRow}
                                >
                                  <Image source={{ uri: item.image }} style={styles.communitySongImage} contentFit="cover" />
                                  <View style={{ flex: 1, gap: 2 }}>
                                    <RNText style={[styles.communitySongTitle, { color: colors.text }]} numberOfLines={1}>{String(item.title || '')}</RNText>
                                    <RNText style={[styles.communitySongArtist, { color: colors.textSecondary }]} numberOfLines={1}>{String(item.artist || '')}</RNText>
                                  </View>
                                </Pressable>
                              ))}
                            </View>
                            {/* Control Bar inside card */}
                            <View style={styles.communityControlsRow}>
                              <Pressable
                                onPress={() => handlePlayPlaylistOrTrack(shelf.items[0], shelf.items)}
                                style={styles.communityControlBtn}
                                disabled={loadingTrackId === shelf.items[0]?.id}
                              >
                                {loadingTrackId === shelf.items[0]?.id ? (
                                  <ActivityIndicator size="small" color={colors.text} />
                                ) : (
                                  <AppIcon ios="play.fill" android="play" size={16} color={colors.text} />
                                )}
                              </Pressable>
                              <Pressable
                                onPress={() => shelf.items.length > 1 && handlePlayPlaylistOrTrack(shelf.items[1], shelf.items)}
                                style={styles.communityControlBtn}
                                disabled={shelf.items.length > 1 && loadingTrackId === shelf.items[1]?.id}
                              >
                                {shelf.items.length > 1 && loadingTrackId === shelf.items[1]?.id ? (
                                  <ActivityIndicator size="small" color={colors.text} />
                                ) : (
                                  <AppIcon ios="forward.fill" android="play-skip-forward" size={16} color={colors.text} />
                                )}
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    }

                    // Default Shelf Renderer (Circular for Artists, Square for Playlists/Tracks)
                    return (
                      <View key={`shelf-default-${shelfIdx}`} style={{ gap: 12 }}>
                        <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>
                          {shelfTitle}
                        </RNText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                            {shelf.items.filter((item: any) => !!item && !!item.id).map((item, index) => renderNormalCard(item, shelf.items, `${shelfIdx}-${index}`))}
                          </View>
                        </ScrollView>
                      </View>
                    );
                  } catch (err) {
                    console.error('[HomeScreen] Error rendering shelf at index', shelfIdx, ':', err);
                    return null;
                  }
                })}

              </View>
            );
          })()}

          {isLoadingMore && (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}
          <View style={{ height: 96 }} />
        </View>
      </ScrollView>
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
  resultsSectionHeader: { width: screenWidth - 32, flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionTitlePadding: { paddingHorizontal: 16 },
  viewAllText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  horizontalRow: { paddingHorizontal: 16 },
  trendingCard: { width: 160 },
  cardImageContainer: { borderRadius: 12, overflow: 'hidden', width: 160, height: 160 },
  cardImage: { width: 160, height: 160 },
  songTitle: { fontSize: 14, fontWeight: '600' },
  songArtist: { fontSize: 12 },
  chartCardPurple: { width: 270, height: 128, backgroundColor: '#593090', borderRadius: 16, padding: 16, position: 'relative' },
  chartCardCyan: { width: 270, height: 128, backgroundColor: '#004f58', borderRadius: 16, padding: 16, position: 'relative' },
  chartCardOrange: { width: 270, height: 128, backgroundColor: '#c85a17', borderRadius: 16, padding: 16, position: 'relative' },
  chartMiniImage: { width: 48, height: 48, borderRadius: 8, position: 'absolute', right: 16, top: 16 },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  chartSubtitle: { fontSize: 11, color: '#ffffff', opacity: 0.8 },
  chartIconContainer: { position: 'absolute', right: 16, top: 16, opacity: 0.25 },
  releaseCard: { width: 112 },
  releaseImageContainer: { borderRadius: 12, overflow: 'hidden', width: 112, height: 112 },
  releaseImage: { width: 112, height: 112 },
  releaseTitle: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  artistCard: { width: 110, alignItems: 'center' },
  artistImageContainer: { borderRadius: 55, overflow: 'hidden', width: 110, height: 110 },
  artistImage: { width: 110, height: 110 },
  quickActionsRow: { paddingHorizontal: 16 },
  quickActionButton: { borderRadius: 16, borderWidth: 1, padding: 16, height: 104 },
  actionIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  speedDialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  speedDialCard: {
    width: (screenWidth - 48) / 3,
    height: (screenWidth - 48) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  speedDialImage: {
    width: '100%',
    height: '100%',
  },
  speedDialTextContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  speedDialText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  speedDialDotsCard: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dotsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  likedCardContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  likedCoverGrid: {
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCoverImage: {
    width: 45,
    height: 45,
  },
  likedCardInfo: {
    flex: 1,
    gap: 4,
  },
  likedCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  likedCardSubtitle: {
    fontSize: 12,
  },
  likedPlayIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -2,
  },
  moodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodPill: {
    width: (screenWidth - 42) / 2,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodText: {
    fontSize: 13,
    fontWeight: '700',
  },
  communityContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  communitySongsList: {
    gap: 8,
  },
  communitySongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  communitySongImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  communitySongTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  communitySongArtist: {
    fontSize: 11,
  },
  communityControlsRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  communityControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});