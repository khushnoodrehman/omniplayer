import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Dimensions, Text as RNText, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore, Track } from '@/store/usePlaybackStore';
import MiniPlayer from '@/components/mini-player';

const { width: screenWidth } = Dimensions.get('window');

// ⚠️ YAHAN APNE LAPTOP KA IPv4 ADDRESS LIKHO
const BACKEND_URL = 'http://192.168.43.179:5000';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { playTrack } = usePlaybackStore();

  // API States
  const [homeData, setHomeData] = useState({
    trending: [] as any[],
    newReleases: [] as any[],
    globalHits: [] as any[],
    topTracks: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  // Fetch Data on Mount
  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/home`);
        const data = await response.json();
        setHomeData({
          trending: data.trending || [],
          newReleases: data.newReleases || [],
          globalHits: data.globalHits || [],
          topTracks: data.topTracks || []
        });
      } catch (error) {
        console.error("Home Data Fetch Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHomeData();
  }, []);

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
      >
        <View style={{ gap: 24 }}>

          {/* Header: Greeting & Profile */}
          <View style={[styles.header, { width: screenWidth - 32, marginHorizontal: 16 }]}>
            <RNText style={[styles.headerTitle, { color: colors.text }]}>{greeting}</RNText>
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
                        style={[styles.trendingCard, { gap: 8 }]} // Trending wala layout use kar rahe hain
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
  quickActionsRow: { paddingHorizontal: 16 },
  quickActionButton: { borderRadius: 16, borderWidth: 1, padding: 16, height: 104 },
  actionIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});