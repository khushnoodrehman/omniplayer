import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text as RNText,
  Pressable,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheet, RNHostView } from '@expo/ui';
import { useTheme } from '@/hooks/use-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { AppIcon } from '@/components/ui/app-icon';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Stitch design token aliases (dark mode primary palette)
const SURFACE_CONTAINER_HIGH = '#292a2d';
const BORDER_WHITE_5 = 'rgba(255,255,255,0.05)';
const BORDER_WHITE_10 = 'rgba(255,255,255,0.10)';
const ON_SURFACE_VARIANT = '#ccc3d3';
const PRIMARY_CONTAINER = '#bd93f9';     // play FAB bg
const ON_PRIMARY_CONTAINER = '#4e2484'; // play FAB icon color

// Helper to format seconds to M:SS
const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function NowPlayingModal() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  const {
    currentTrack,
    favoriteTracks,
    duration,
    position,
    seek,
    isPlayerVisible,
    setPlayerVisible,
    toggleFavorite,
    isPlaying,
    togglePlay,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    playNext,
    playPrevious
  } = usePlaybackStore();

  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'queue'>('lyrics');

  if (!currentTrack) return null;

  const isFavorited = favoriteTracks.includes(currentTrack.id);
  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const handleSeekBarPress = (e: any) => {
    const { locationX } = e.nativeEvent;
    const barWidth = screenWidth - 32;
    const clickRatio = Math.max(0, Math.min(locationX / barWidth, 1));
    seek(clickRatio * duration);
  };

  // Ambient glow color behind album art
  const artGlowColor = colors.accent.replace(')', ', 0.30)').replace('rgb(', 'rgba(') ?? 'rgba(215,186,255,0.30)';

  return (
    <BottomSheet
      isPresented={isPlayerVisible}
      onDismiss={() => {
        setPlayerVisible(false);
        setIsLyricsExpanded(false);
      }}
      snapPoints={['full']}
      showDragIndicator={true}
    >
      <RNHostView matchContents>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          {/* ═══ LAYER 0: Immersive full-bleed gradient background ═══ */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Layer 1: Top-to-bottom primary purple wash — full width */}
            <LinearGradient
              colors={[
                'rgba(215,186,255,0.28)',
                'rgba(215,186,255,0.10)',
                'rgba(0,0,0,0)',
              ]}
              locations={[0, 0.35, 0.75]}
              style={StyleSheet.absoluteFill}
            />
            {/* Layer 2: Left-to-right diagonal purple accent — covers entire top half */}
            <LinearGradient
              colors={['rgba(189,147,249,0.18)', 'rgba(0,0,0,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Layer 3: Bottom-right teal accent — full width diagonal */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', `rgba(0,218,243,0.06)`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {/* ═══ MAIN CANVAS ═══ */}
          <View
            style={[
              styles.mainCanvas,
              {
                paddingTop: 8, // The sheet has its own native drag handle
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.headerRow}>
                {/* Source badge — glassmorphism pill matching Stitch */}
                <View
                  style={[
                    styles.sourceBadge,
                    {
                      backgroundColor: `${SURFACE_CONTAINER_HIGH}66`, // 40% opacity
                      borderColor: BORDER_WHITE_5,
                    },
                  ]}
                >
                  <AppIcon
                    ios="folder.fill"
                    android="folder-open-outline"
                    size={16}
                    color={colors.accent}
                  />
                  <RNText style={[styles.sourceBadgeText, { color: ON_SURFACE_VARIANT }]}>
                    {currentTrack.sourceType === 'local' ? 'Playing from Local' : 'Playing from YouTube'}
                  </RNText>
                </View>

                <Pressable
                  onPress={() => alert('Track Options')}
                  style={styles.headerMenuButton}
                >
                  <AppIcon
                    ios="ellipsis"
                    android="ellipsis-vertical"
                    size={22}
                    color={colors.text}
                  />
                </Pressable>
              </View>
            </View>

            {/* ── Album Art ── */}
            <View style={styles.artSection}>
              <View style={styles.artCardContainer}>
                {/* Vivid purple glow behind the card ── */}
                <View
                  style={[
                    styles.artGlow,
                    { backgroundColor: artGlowColor },
                  ]}
                />
                {/* Cover image with white/10 border */}
                <Image
                  source={{ uri: currentTrack.image }}
                  style={[styles.albumArt, { borderColor: BORDER_WHITE_10 }]}
                  contentFit="cover"
                />
              </View>
            </View>

            {/* ── Track Info ── */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <RNText style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
                    {currentTrack.title}
                  </RNText>
                  <RNText style={[styles.trackArtist, { color: colors.accent }]} numberOfLines={1}>
                    {currentTrack.artist}
                  </RNText>
                </View>

                <View style={styles.actionButtons}>
                  <Pressable
                    onPress={() => toggleFavorite(currentTrack.id)}
                    style={styles.iconButton}
                  >
                    <AppIcon
                      ios={isFavorited ? 'heart.fill' : 'heart'}
                      android={isFavorited ? 'heart' : 'heart-outline'}
                      size={22}
                      color={isFavorited ? colors.pulseDot : ON_SURFACE_VARIANT}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => alert('Download Offline')}
                    style={styles.iconButton}
                  >
                    <AppIcon
                      ios="arrow.down.to.line"
                      android="download-outline"
                      size={22}
                      color={ON_SURFACE_VARIANT}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* ── Playback Controls & Seekbar ── */}
            <View style={styles.controlsSection}>
              {/* Seekbar */}
              <Pressable onPress={handleSeekBarPress} style={styles.seekbarContainer}>
                <View style={[styles.seekbarBg, { backgroundColor: 'rgba(204,195,211,0.20)' }]}>
                  <View
                    style={[
                      styles.seekbarFill,
                      { backgroundColor: colors.accent, width: `${progressPercentage}%` },
                    ]}
                  />
                </View>
              </Pressable>

              {/* Timestamps */}
              <View style={styles.timestampsRow}>
                <RNText style={[styles.timestampText, { color: ON_SURFACE_VARIANT }]}>
                  {formatTime(position)}
                </RNText>
                <RNText style={[styles.timestampText, { color: ON_SURFACE_VARIANT }]}>
                  {formatTime(duration)}
                </RNText>
              </View>

              {/* Playback Buttons */}
              <View style={styles.buttonRow}>
                <Pressable onPress={playPrevious}>
                  <AppIcon
                    ios="shuffle"
                    android="shuffle"
                    size={22}
                    color={isShuffle ? colors.accent : ON_SURFACE_VARIANT}
                  />
                </Pressable>

                <Pressable onPress={playPrevious}>
                  <AppIcon
                    ios="backward.fill"
                    android="play-back"
                    size={34}
                    color={colors.text}
                  />
                </Pressable>

                {/* FAB */}
                <Pressable
                  onPress={togglePlay}
                  style={[
                    styles.playPauseFAB,
                    {
                      backgroundColor: PRIMARY_CONTAINER,
                      ...Platform.select({
                        ios: {
                          shadowColor: PRIMARY_CONTAINER,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.45,
                          shadowRadius: 12,
                        },
                        android: { elevation: 10 },
                      }),
                    },
                  ]}
                >
                  <AppIcon
                    ios={isPlaying ? 'pause.fill' : 'play.fill'}
                    android={isPlaying ? 'pause' : 'play'}
                    size={42}
                    color={ON_PRIMARY_CONTAINER}
                  />
                </Pressable>

                <Pressable onPress={playNext}>
                  <AppIcon
                    ios="forward.fill"
                    android="play-forward"
                    size={34}
                    color={colors.text}
                  />
                </Pressable>

                <Pressable onPress={toggleRepeat}>
                  <AppIcon
                    ios="repeat"
                    android="repeat"
                    size={22}
                    color={isRepeat ? colors.accent : ON_SURFACE_VARIANT}
                  />
                </Pressable>
              </View>
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* ── Lyrics Peek Bar ── */}
            <Pressable
              style={styles.lyricsPeekContainer}
              onPress={() => setIsLyricsExpanded(true)}
            >
              {/* Glass blur background */}
              <View style={styles.lyricsPeekGlass} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <AppIcon
                  ios="quote.bubble"
                  android="chatbubble-ellipses-outline"
                  size={18}
                  color={colors.accent}
                />
                <RNText
                  style={[styles.lyricsPeekText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {"\"Waiting in a car... Waiting for a ride\""}
                </RNText>
              </View>
              <AppIcon
                ios="chevron.up"
                android="chevron-up"
                size={18}
                color={ON_SURFACE_VARIANT}
              />
            </Pressable>
          </View>

          {/* ═══ EXPANDED LYRICS / QUEUE DRAWER ═══ */}
          {isLyricsExpanded && (
            <View
              style={[
                styles.expandedDrawer,
                { paddingTop: Math.max(insets.top, 16) },
              ]}
            >
              {/* Glass blur fill for drawer */}
              <View style={styles.expandedDrawerGlass} />

              {/* Drawer header */}
              <View style={styles.expandedDrawerHeader}>
                <View style={styles.expandedDrawerHandle} />
                <View style={styles.expandedHeaderRow}>
                  <View style={{ flexDirection: 'row', gap: 24 }}>
                    <Pressable onPress={() => setActiveTab('lyrics')}>
                      <RNText
                        style={[
                          styles.drawerTabButton,
                          { color: activeTab === 'lyrics' ? colors.accent : ON_SURFACE_VARIANT },
                          activeTab === 'lyrics' && {
                            borderBottomColor: colors.accent,
                            borderBottomWidth: 2,
                          },
                        ]}
                      >
                        Lyrics
                      </RNText>
                    </Pressable>
                    <Pressable onPress={() => setActiveTab('queue')}>
                      <RNText
                        style={[
                          styles.drawerTabButton,
                          { color: activeTab === 'queue' ? colors.accent : ON_SURFACE_VARIANT },
                          activeTab === 'queue' && {
                            borderBottomColor: colors.accent,
                            borderBottomWidth: 2,
                          },
                        ]}
                      >
                        Up Next
                      </RNText>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => setIsLyricsExpanded(false)}
                    style={styles.drawerCloseBtn}
                  >
                    <AppIcon
                      ios="chevron.down"
                      android="chevron-down"
                      size={24}
                      color={colors.text}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Scrollable content */}
              <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: 64 }}
                showsVerticalScrollIndicator={false}
              >
                {activeTab === 'lyrics' ? (
                  <View style={{ gap: 24 }}>
                    <RNText style={[styles.lyricTitle, { color: ON_SURFACE_VARIANT }]}>
                      {currentTrack.title}
                    </RNText>
                    <RNText style={[styles.lyricLineNormal, { color: colors.text }]}>
                      Waiting in a car{'\n'}Waiting for a ride in the dark
                    </RNText>
                    <RNText style={[styles.lyricLineNormal, { color: colors.text }]}>
                      The night city grows{'\n'}Look at the horizon glow
                    </RNText>
                    <RNText style={[styles.lyricLineHighlight, { color: colors.accent }]}>
                      {"\"The city is my church...\""}
                    </RNText>
                    <RNText style={[styles.lyricLineNormal, { color: colors.text }]}>
                      It wraps me in its sparkling arms
                    </RNText>
                    <RNText style={[styles.lyricLineNormal, { color: colors.text }]}>
                      The night city grows{'\n'}Look at the horizon glow
                    </RNText>
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    <RNText style={[styles.lyricTitle, { color: ON_SURFACE_VARIANT }]}>QUEUE</RNText>
                    {/* Now Playing */}
                    <View
                      style={[
                        styles.queueItem,
                        { backgroundColor: `${SURFACE_CONTAINER_HIGH}99`, borderColor: BORDER_WHITE_10 },
                      ]}
                    >
                      <Image
                        source={{ uri: currentTrack.image }}
                        style={styles.queueItemArt}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <RNText style={[styles.queueItemTitle, { color: colors.text }]} numberOfLines={1}>
                          {currentTrack.title} (Now Playing)
                        </RNText>
                        <RNText style={[styles.queueItemArtist, { color: ON_SURFACE_VARIANT }]} numberOfLines={1}>
                          {currentTrack.artist}
                        </RNText>
                      </View>
                    </View>

                    <RNText style={[styles.queueUpcomingLabel, { color: colors.accent, marginTop: 12 }]}>
                      Next Songs
                    </RNText>

                    {/* Next track 1 */}
                    <View
                      style={[
                        styles.queueItem,
                        { backgroundColor: `${SURFACE_CONTAINER_HIGH}99`, borderColor: BORDER_WHITE_10 },
                      ]}
                    >
                      <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhfq7XJon8xNjH4kku2qi-t0541UtnlKoowqz8gGCflJr1KzVAPqUfeyO3H-vu7OeQQ9nU_Dk_AoqMCqmdQ-p0t6niwm7ALrbjyzxnrift-UsEH6YAUNQ1Oj7apZkdzHUYEo1lk8HjxLQFU6svtf4BEMFWs9Gp2kH5kwUfwo_g623Polz4YemCtc8givXSYOjGUbJxjszml6xsZjUwwo5jISg1rorJ_Jvs--tTDCYjdKNl0LpiN5MEFsNmQzBY69cma00GLySEv5NY' }}
                        style={styles.queueItemArt}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <RNText style={[styles.queueItemTitle, { color: colors.text }]} numberOfLines={1}>
                          Digital Dreams
                        </RNText>
                        <RNText style={[styles.queueItemArtist, { color: ON_SURFACE_VARIANT }]} numberOfLines={1}>
                          Future Bass
                        </RNText>
                      </View>
                    </View>

                    {/* Next track 2 */}
                    <View
                      style={[
                        styles.queueItem,
                        { backgroundColor: `${SURFACE_CONTAINER_HIGH}99`, borderColor: BORDER_WHITE_10 },
                      ]}
                    >
                      <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBii0ifsO0Oxt2cZuQ6Lr35U6adiMohoAEA5es2m4YnpHmC-4sk_2L7kyGFSWZFaCJ-eGJHD1ZhUVBBdy0bXwprvUnERJWpGs1JGZ7mE2noKFk3RPS2tS09zKCQ5C2-OmeA_R-x9rgsMyTeyoiXCKN2mU7IIODn9VTnkKm7uC8sVA06iT0Mro0QfA2jp63-BM5JVdWM2ehZMwgM5U3dXSpKjmOvgPIlJQBQ53_daH0XejobcTcWrkiQUb3BxGhGLeHS0CgM00RiosJq' }}
                        style={styles.queueItemArt}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <RNText style={[styles.queueItemTitle, { color: colors.text }]} numberOfLines={1}>
                          Neon Pulse
                        </RNText>
                        <RNText style={[styles.queueItemArtist, { color: ON_SURFACE_VARIANT }]} numberOfLines={1}>
                          Hyperpop Hits
                        </RNText>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      </RNHostView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: {
    width: screenWidth,
    height: screenHeight,
    overflow: 'hidden',
  },

  // ── Layout ──
  mainCanvas: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 48,
  },

  // Source badge — glassy pill
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Album art — fixed height so it doesn't push header/controls off screen
  artSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  artCardContainer: {
    position: 'relative',
    width: Math.min(screenWidth - 64, 280),
    height: Math.min(screenWidth - 64, 280),
    justifyContent: 'center',
    alignItems: 'center',
  },
  artGlow: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderRadius: 24,
    // Platform glow: iOS shadow, Android elevation
    ...Platform.select({
      ios: {
        shadowColor: '#d7baff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 40,
      },
      android: { elevation: 18 },
    }),
  },
  albumArt: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 1,
  },

  // Track info
  infoSection: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  trackTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  trackArtist: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Controls
  controlsSection: {
    width: '100%',
  },
  seekbarContainer: {
    width: '100%',
    paddingVertical: 12,
  },
  seekbarBg: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  seekbarFill: {
    height: '100%',
    borderRadius: 3,
  },
  timestampsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: -4,
    marginBottom: 24,
  },
  timestampText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  // Play FAB — Stitch: w-20 h-20 rounded-full bg-primary-container
  playPauseFAB: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Lyrics peek bar — glass panel
  lyricsPeekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: BORDER_WHITE_10,
    overflow: 'hidden',
    marginHorizontal: -16, // extend full width beyond canvas padding
  },
  lyricsPeekGlass: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(30,32,35,0.65)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  lyricsPeekText: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
    flex: 1,
    opacity: 0.85,
  },

  // Expanded lyrics drawer — glass panel
  expandedDrawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: screenHeight * 0.85,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    zIndex: 200,
  },
  expandedDrawerGlass: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(18,19,22,0.92)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  expandedDrawerHeader: {
    alignItems: 'center',
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_WHITE_10,
  },
  expandedDrawerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 8,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    height: 52,
  },
  drawerTabButton: {
    fontSize: 16,
    fontWeight: '600',
    paddingBottom: 8,
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Lyrics text
  lyricTitle: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.5,
  },
  lyricLineNormal: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
    opacity: 0.9,
  },
  lyricLineHighlight: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 42,
    fontStyle: 'italic',
  },

  // Queue items
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  queueItemArt: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  queueItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  queueItemArtist: {
    fontSize: 11,
    marginTop: 2,
  },
  queueUpcomingLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
