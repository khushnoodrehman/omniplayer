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

const { width: screenWidth } = Dimensions.get('window');

// ⚠️ YAHAN APNE LAPTOP KA IPv4 ADDRESS LIKHO
const BACKEND_URL = 'http://192.168.137.141:5000';

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
    topTracks: [] as any[],
    shelves: [] as HomeShelf[],
    likedPlaylist: null as any
  });
  const [showSpeedDial, setShowSpeedDial] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

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

          console.log("DEBUG COOKIE:", cookies); // Ye terminal (Expo Metro) mein dekho
          console.log("[HomeScreen] Retrieved yt_cookies from AsyncStorage:", cookies ? "Cookies exist" : "No cookies found");
          const headers: HeadersInit = {};
          if (cookies) {
            headers['Authorization'] = `Bearer ${cookies}`;
          }
          const response = await fetch(`${BACKEND_URL}/api/home`, { headers });
          const data = await response.json();
          if (isMounted) {
            setHomeData({
              isLoggedIn: data.isLoggedIn || false,
              trending: data.trending || [],
              newReleases: data.newReleases || [],
              globalHits: data.globalHits || [],
              topTracks: data.topTracks || [],
              shelves: data.shelves || [],
              likedPlaylist: data.likedPlaylist || null
            });
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
    const isPlayable = item.itemType === 'track';
    const isArtist = item.itemType === 'artist';

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
          <RNText style={[styles.songTitle, { color: colors.text, textAlign: isArtist ? 'center' : 'left' }]} numberOfLines={1}>{item.title}</RNText>
          {!isArtist && (
            <RNText style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artist}</RNText>
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

          {homeData.isLoggedIn ? (() => {
            const speedDialShelf = homeData.shelves.find(s => s.title.toLowerCase().includes('speed dial'));
            const otherShelves = homeData.shelves.filter(s => !s.title.toLowerCase().includes('speed dial'));

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

                {/* ── SECTION B: Your YouTube Playlists (Second Row) ── */}
                {homeData.likedPlaylist && (
                  <View style={{ gap: 12, paddingHorizontal: 16 }}>
                    <View style={styles.resultsSectionHeader}>
                      <View style={{ gap: 2 }}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Your YouTube playlists</RNText>
                        <RNText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Khushnood Rehman</RNText>
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
                )}

                {/* ── SECTION C: Other shelves ── */}
                {otherShelves.map((shelf, shelfIdx) => {
                  if (!shelf || !shelf.items || shelf.items.length === 0) return null;

                  const titleLower = (shelf.title || '').toLowerCase();
                  const isKeepListening = titleLower.includes('keep listening');
                  const isMoods = titleLower.includes('moods') || titleLower.includes('genre');
                  const isCommunity = titleLower.includes('community');

                  if (isKeepListening) {
                    const chunked = chunkKeepListening(shelf.items);
                    return (
                      <View key={shelf.title || shelfIdx} style={{ gap: 12 }}>
                        <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>
                          {shelf.title}
                        </RNText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={[styles.horizontalRow, { flexDirection: 'column', gap: 12, paddingBottom: 8 }]}>
                            <View style={{ flexDirection: 'row', gap: 16 }}>
                              {chunked.row1.map((item, idx) => renderNormalCard(item, shelf.items, `kl-r1-${idx}`))}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 16 }}>
                              {chunked.row2.map((item, idx) => renderNormalCard(item, shelf.items, `kl-r2-${idx}`))}
                            </View>
                          </View>
                        </ScrollView>
                      </View>
                    );
                  }

                  if (isMoods) {
                    return (
                      <View key={shelf.title || shelfIdx} style={{ gap: 12, paddingHorizontal: 16 }}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>
                          {shelf.title}
                        </RNText>
                        <View style={styles.moodsGrid}>
                          {shelf.items.slice(0, 8).map((item, idx) => (
                            <Pressable
                              key={`mood-${idx}`}
                              onPress={() => router.push(`/search?q=${encodeURIComponent(item.title)}`)}
                              style={({ pressed }) => [
                                styles.moodPill,
                                { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                                pressed && styles.pressed
                              ]}
                            >
                              <RNText style={[styles.moodText, { color: colors.text }]} numberOfLines={1}>
                                {item.title}
                              </RNText>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    );
                  }

                  if (isCommunity) {
                    return (
                      <View key={shelf.title || shelfIdx} style={{ gap: 12, paddingHorizontal: 16 }}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>
                          {shelf.title}
                        </RNText>
                        <View style={[styles.communityContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
                          <View style={styles.communitySongsList}>
                            {shelf.items.slice(0, 4).map((item, idx) => (
                              <Pressable
                                key={`comm-${item.id}-${idx}`}
                                onPress={() => handlePlay(item, shelf.items)}
                                style={styles.communitySongRow}
                              >
                                <Image source={{ uri: item.image }} style={styles.communitySongImage} contentFit="cover" />
                                <View style={{ flex: 1, gap: 2 }}>
                                  <RNText style={[styles.communitySongTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</RNText>
                                  <RNText style={[styles.communitySongArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artist}</RNText>
                                </View>
                              </Pressable>
                            ))}
                          </View>
                          {/* Control Bar inside card */}
                          <View style={styles.communityControlsRow}>
                            <Pressable onPress={() => handlePlay(shelf.items[0], shelf.items)} style={styles.communityControlBtn}>
                              <AppIcon ios="play.fill" android="play" size={16} color={colors.text} />
                            </Pressable>
                            <Pressable onPress={() => handlePlay(shelf.items[1], shelf.items)} style={styles.communityControlBtn}>
                              <AppIcon ios="forward.fill" android="play-skip-forward" size={16} color={colors.text} />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  }

                  // Default Shelf Renderer (Circular for Artists, Square for Playlists/Tracks)
                  return (
                    <View key={shelf.title || shelfIdx} style={{ gap: 12 }}>
                      <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>
                        {shelf.title}
                      </RNText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                          {shelf.items.map((item, index) => renderNormalCard(item, shelf.items, `${shelfIdx}-${index}`))}
                        </View>
                      </ScrollView>
                    </View>
                  );
                })}
              </View>
            );
          })() : (
            // --- NOT LOGGED IN USER INTERFACE (Old Home Screen) ---
            <View style={{ gap: 24 }}>
              {/* Section 1: Trending Now */}
              {homeData.trending.length > 0 && (
                <View style={{ gap: 12 }}>
                  <View style={[styles.resultsSectionHeader, { paddingHorizontal: 16 }]}>
                    <RNText style={[styles.sectionTitle, { color: colors.text }]}>Trending Now</RNText>
                    <View style={{ flex: 1 }} />
                    <RNText style={[styles.viewAllText, { color: colors.accent }]} onPress={() => alert('Viewing all trending...')}>VIEW ALL</RNText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                      {homeData.trending
                        .filter((item) => item !== null && item !== undefined && item.id)
                        .map((item, index) => (
                          <Pressable
                            key={item.id || `trending-${index}`}
                            style={[styles.trendingCard, { gap: 8 }]}
                            onPress={() => handlePlay(item, homeData.trending)}
                          >
                            <View style={[styles.cardImageContainer, { backgroundColor: colors.backgroundElement, position: 'relative' }]}>
                              <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                              {loadingTrackId === item.id && (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                                  <ActivityIndicator size="small" color="#fff" />
                                </View>
                              )}
                            </View>
                            <View style={{ gap: 2 }}>
                              <RNText style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</RNText>
                              <RNText style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artist}</RNText>
                            </View>
                          </Pressable>
                        ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Section 2: Top Global Charts (Static Nav Cards) */}
              <View style={{ gap: 12 }}>
                <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>Top Global Charts</RNText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                    <Pressable style={[styles.chartCardPurple, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => alert('Opening Global Top 50...')}>
                      <View style={{ flex: 1, justifyContent: 'flex-end', height: '100%' }}>
                        <RNText style={styles.chartTitle}>Global Top 50</RNText>
                        <RNText style={styles.chartSubtitle}>Updated Daily</RNText>
                      </View>
                      <View style={styles.chartIconContainer}>
                        <AppIcon ios="chart.bar.xaxis" android="bar-chart" size={56} color="#ffffff" />
                      </View>
                    </Pressable>
                    <Pressable style={[styles.chartCardCyan, { flexDirection: 'row', alignItems: 'center' }]} onPress={() => alert('Opening Viral Hits...')}>
                      <View style={{ flex: 1, justifyContent: 'flex-end', height: '100%' }}>
                        <RNText style={styles.chartTitle}>Viral Hits</RNText>
                        <RNText style={styles.chartSubtitle}>Trending Worldwide</RNText>
                      </View>
                      <View style={styles.chartIconContainer}>
                        <AppIcon ios="arrow.up.forward.app.fill" android="trending-up" size={56} color="#ffffff" />
                      </View>
                    </Pressable>
                  </View>
                </ScrollView>
              </View>

              {/* Section 3: Global Hits (Dynamic tracks) */}
              {homeData.globalHits.length > 0 && (
                <View style={{ gap: 12 }}>
                  <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>Global Hits</RNText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                      {homeData.globalHits
                        .filter((item) => item !== null && item !== undefined && item.id)
                        .map((item, index) => (
                          <Pressable
                            key={item.id || `global-${index}`}
                            style={[styles.trendingCard, { gap: 8 }]}
                            onPress={() => handlePlay(item, homeData.globalHits)}
                          >
                            <View style={[styles.cardImageContainer, { backgroundColor: colors.backgroundElement }]}>
                              <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                              {loadingTrackId === item.id && (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                                  <ActivityIndicator size="small" color="#fff" />
                                </View>
                              )}
                            </View>
                            <View style={{ gap: 2 }}>
                              <RNText style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</RNText>
                              <RNText style={[styles.songArtist, { color: colors.textSecondary }]} numberOfLines={1}>{item.artist}</RNText>
                            </View>
                          </Pressable>
                        ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Section 4: New Releases */}
              {homeData.newReleases.length > 0 && (
                <View style={{ gap: 12 }}>
                  <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>New Releases</RNText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                      {homeData.newReleases
                        .filter((item) => item !== null && item !== undefined && item.id)
                        .map((item, index) => (
                          <Pressable
                            key={item.id || `new-${index}`}
                            style={[styles.releaseCard, { gap: 8 }]}
                            onPress={() => handlePlay(item, homeData.newReleases)}
                          >
                            <View style={[styles.releaseImageContainer, { backgroundColor: colors.backgroundElement }]}>
                              <Image source={{ uri: item.image }} style={styles.releaseImage} contentFit="cover" />
                              {loadingTrackId === item.id && (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                                  <ActivityIndicator size="small" color="#fff" />
                                </View>
                              )}
                            </View>
                            <RNText style={[styles.releaseTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</RNText>
                          </Pressable>
                        ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Section 5: Quick Actions (Static) */}
          <View style={[styles.quickActionsRow, { flexDirection: 'row', width: screenWidth, gap: 16 }]}>
            <Pressable style={[styles.quickActionButton, { flex: 1, gap: 8, alignItems: 'center', backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]} onPress={() => alert('Scanning local storage...')}>
              <View style={[styles.actionIconWrapper, { backgroundColor: colors.accentLight }]}>
                <AppIcon ios="folder.badge.plus" android="folder-open" size={22} color={colors.accent} />
              </View>
              <RNText style={[styles.actionText, { color: colors.text }]}>Scan Local Storage</RNText>
            </Pressable>
            <Pressable style={[styles.quickActionButton, { flex: 1, gap: 8, alignItems: 'center', backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]} onPress={() => alert('Importing playlist...')}>
              <View style={[styles.actionIconWrapper, { backgroundColor: colors.accentLight }]}>
                <AppIcon ios="link" android="link" size={22} color={colors.accent} />
              </View>
              <RNText style={[styles.actionText, { color: colors.text }]}>Import Playlist</RNText>
            </Pressable>
          </View>

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
  chartTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  chartSubtitle: { fontSize: 12, color: '#ffffff', opacity: 0.8 },
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