import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text as RNText, Pressable, Dimensions, ScrollView, Platform, ActivityIndicator, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { usePlaybackStore, Track } from '@/store/usePlaybackStore';
import { AppIcon } from '@/components/ui/app-icon';
import { BlurView } from 'expo-blur';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate, 
  Extrapolation,
  runOnJS 
} from 'react-native-reanimated';
import { useSegments } from 'expo-router';
import { getDownloadDB } from '@/services/db';
import * as FileSystem from 'expo-file-system/legacy';
import DownloadSheet from '@/components/download-sheet';
import TrackOptionsSheet from '@/components/track-options-sheet';
import LyricsView from '@/components/lyrics-view';
import { useProgress } from '@rntp/player';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SURFACE_CONTAINER_HIGH = '#292a2d';
const BORDER_WHITE_5 = 'rgba(255,255,255,0.05)';
const BORDER_WHITE_10 = 'rgba(255,255,255,0.10)';
const ON_SURFACE_VARIANT = '#ccc3d3';
const PRIMARY_CONTAINER = '#bd93f9';
const ON_PRIMARY_CONTAINER = '#4e2484';
const COLLAPSED_HEIGHT = 64;

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function NowPlayingBottomSheet() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const {
    currentTrack,
    favoriteTracks,
    seek,
    isPlayerVisible,
    setPlayerVisible,
    toggleFavorite,
    togglePlay,
    isShuffle,
    toggleShuffle,
    isRepeat,
    toggleRepeat,
    playNext,
    playPrevious,
    isPlaying,
    position: storePosition,
    duration: storeDuration,
    downloadQueue,
    currentDownloadingTrackId,
    currentDownloadProgress,
    downloadTrack,
  } = usePlaybackStore();

  // Progress hook fallback
  const progress = useProgress(0.1);
  const position = storePosition || progress.position || 0;
  const duration = storeDuration || progress.duration || 0;

  const [pageIndex, setPageIndex] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'downloaded'>('idle');
  const [isDownloadSheetVisible, setIsDownloadSheetVisible] = useState(false);
  const [isTrackOptionsVisible, setIsTrackOptionsVisible] = useState(false);
  const [seekBarWidth, setSeekBarWidth] = useState(screenWidth - 64);

  // Position shared values for Bottom Sheet
  const isTabScreen = segments[0] === '(tabs)';
  // Offset bottom based on bottom tab bar height and safe area
  const bottomOffset = isTabScreen ? 49 + 12 + insets.bottom : 12 + insets.bottom;
  const collapsedY = screenHeight - COLLAPSED_HEIGHT - bottomOffset;
  const expandedY = 0;
  const dragRange = collapsedY - expandedY;

  const translateY = useSharedValue(collapsedY);
  const contextY = useSharedValue(0);

  // Sync isPlayerVisible from store to bottom sheet position
  useEffect(() => {
    if (currentTrack) {
      if (isPlayerVisible) {
        translateY.value = withSpring(expandedY, { damping: 15, stiffness: 100 });
      } else {
        translateY.value = withSpring(collapsedY, { damping: 15, stiffness: 100 });
      }
    }
  }, [isPlayerVisible, collapsedY, currentTrack]);

  // Check download status
  useEffect(() => {
    let active = true;
    const checkDownloadStatus = async () => {
      if (!currentTrack) return;
      try {
        const download = await getDownloadDB(currentTrack.id);
        if (download && download.localPath) {
          const fileInfo = await FileSystem.getInfoAsync(download.localPath);
          if (fileInfo.exists) {
            if (active) setDownloadStatus('downloaded');
            return;
          }
        }
        if (active) setDownloadStatus('idle');
      } catch (err) {
        console.error("[NowPlayingBottomSheet] Error checking download status:", err);
      }
    };
    checkDownloadStatus();
    return () => {
      active = false;
    };
  }, [currentTrack, downloadQueue, currentDownloadingTrackId]);

  if (!currentTrack) return null;

  const isFavorited = favoriteTracks.includes(currentTrack.id);
  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const handleSeekBarPress = (e: any) => {
    const { locationX } = e.nativeEvent;
    const clickRatio = Math.max(0, Math.min(locationX / seekBarWidth, 1));
    seek(clickRatio * duration);
  };

  const isEnqueued = downloadQueue.some(item => item.track.id === currentTrack.id);
  const isDownloading = currentDownloadingTrackId === currentTrack.id;
  const activeDownloadStatus = downloadStatus === 'downloaded' 
    ? 'downloaded' 
    : (isDownloading ? 'downloading' : (isEnqueued ? 'enqueued' : 'idle'));

  const artGlowColor = colors.accent.replace(')', ', 0.30)').replace('rgb(', 'rgba(') ?? 'rgba(215,186,255,0.30)';

  // Pan Gesture logic
  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = Math.max(
        expandedY, 
        Math.min(collapsedY, contextY.value + event.translationY)
      );
    })
    .onEnd((event) => {
      if (event.velocityY < -500) {
        // Swipe up fast
        translateY.value = withSpring(expandedY, { damping: 15 });
        runOnJS(setPlayerVisible)(true);
      } else if (event.velocityY > 500) {
        // Swipe down fast
        translateY.value = withSpring(collapsedY, { damping: 15 });
        runOnJS(setPlayerVisible)(false);
      } else {
        // Snap to nearest
        if (translateY.value < dragRange * 0.6) {
          translateY.value = withSpring(expandedY, { damping: 15 });
          runOnJS(setPlayerVisible)(true);
        } else {
          translateY.value = withSpring(collapsedY, { damping: 15 });
          runOnJS(setPlayerVisible)(false);
        }
      }
    });

  // Reanimated style interpolations
  const animatedSheetStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateY.value,
      [collapsedY, expandedY],
      [0, 1],
      Extrapolation.CLAMP
    );

    const borderRadius = interpolate(progress, [0, 1], [12, 0]);
    const left = interpolate(progress, [0, 1], [16, 0]);
    const right = interpolate(progress, [0, 1], [16, 0]);
    const height = screenHeight - translateY.value;

    return {
      position: 'absolute',
      top: translateY.value,
      left,
      right,
      height,
      borderRadius,
      backgroundColor: colors.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    };
  });

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateY.value,
      [collapsedY, expandedY],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: progress,
    };
  });

  const animatedMiniPlayerStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateY.value,
      [collapsedY, expandedY],
      [0, 0.15],
      Extrapolation.CLAMP
    );
    return {
      opacity: 1 - (progress / 0.15),
      display: progress >= 0.15 ? 'none' : 'flex',
    };
  });

  const animatedFullPlayerStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      translateY.value,
      [collapsedY, expandedY],
      [0.15, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity: progress,
      display: progress <= 0.05 ? 'none' : 'flex',
    };
  });

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / screenWidth);
    if (page !== pageIndex) {
      setPageIndex(page);
    }
  };

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheetContainer, animatedSheetStyle]} pointerEvents="auto">
          
          {/* 🌟 1. IMMERSIVE BLURRED BACKGROUND */}
          <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]} pointerEvents="none">
            <Image
              source={{ uri: currentTrack.image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
            <BlurView intensity={80} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.45)' }]} />
          </Animated.View>

          {/* 🌟 2. MINI-PLAYER VIEW (COLLAPSED) */}
          <Animated.View style={[styles.miniPlayerContent, animatedMiniPlayerStyle]}>
            <Pressable 
              onPress={() => setPlayerVisible(true)}
              style={styles.miniPlayerPressWrapper}
            >
              <Image source={{ uri: currentTrack.image }} style={styles.miniArt} contentFit="cover" />
              
              <View style={{ flex: 1, justifyContent: 'center', gap: 2 }}>
                <RNText style={[styles.miniTitle, { color: colors.text }]} numberOfLines={1}>{currentTrack.title}</RNText>
                <RNText style={[styles.miniArtist, { color: colors.textSecondary }]} numberOfLines={1}>{currentTrack.artist}</RNText>
              </View>

              <View style={styles.miniControlsRow}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  style={({ pressed }) => [styles.miniPlayBtn, pressed && styles.pressed]}
                >
                  <AppIcon
                    ios={isPlaying ? 'pause.fill' : 'play.fill'}
                    android={isPlaying ? 'pause' : 'play'}
                    size={22}
                    color={colors.text}
                  />
                </Pressable>
                
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    playNext();
                  }}
                  style={({ pressed }) => [styles.miniSkipBtn, pressed && styles.pressed]}
                >
                  <AppIcon
                    ios="forward.fill"
                    android="play-skip-forward"
                    size={20}
                    color={colors.text}
                  />
                </Pressable>
              </View>
            </Pressable>
            
            {/* Progress line */}
            <View style={[styles.miniProgressBarBg, { backgroundColor: colors.divider }]}>
              <View style={[styles.miniProgressBarFill, { backgroundColor: colors.accent, width: `${progressPercentage}%` }]} />
            </View>
          </Animated.View>

          {/* 🌟 3. FULL PLAYER VIEW (EXPANDED) */}
          <Animated.View style={[styles.fullPlayerContent, animatedFullPlayerStyle, { paddingTop: Math.max(insets.top, 16) }]}>
            
            {/* Down drag indicator handle */}
            <View style={styles.dragIndicatorWrapper}>
              <View style={[styles.dragHandle, { backgroundColor: colors.textSecondary }]} />
            </View>

            {/* Header row */}
            <View style={styles.fullHeader}>
              <Pressable
                onPress={() => setPlayerVisible(false)}
                style={styles.headerButton}
              >
                <AppIcon ios="chevron.down" android="chevron-down" size={24} color={colors.text} />
              </Pressable>
              <View style={styles.headerTitleCenter}>
                <RNText style={[styles.fullHeaderTitle, { color: colors.text }]}>{currentTrack.title}</RNText>
                <RNText style={[styles.fullHeaderArtist, { color: colors.textSecondary }]}>{currentTrack.artist}</RNText>
              </View>
              <Pressable
                onPress={() => setIsTrackOptionsVisible(true)}
                style={styles.headerButton}
              >
                <AppIcon ios="ellipsis" android="ellipsis-vertical" size={22} color={colors.text} />
              </Pressable>
            </View>

            {/* 🌟 SWIPEABLE PAGER (Horizontal Album Art & Synced Lyrics) */}
            <View style={styles.pagerContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollViewPager}
              >
                {/* Page 1: Rounded Album Art with shadow/glow */}
                <View style={[styles.pagerPage, { width: screenWidth }]}>
                  <View style={styles.artCardContainer}>
                    <View style={[styles.artGlow, { backgroundColor: artGlowColor }]} />
                    <Image
                      source={{ uri: currentTrack.image }}
                      style={[styles.albumArt, { borderColor: BORDER_WHITE_10 }]}
                      contentFit="cover"
                    />
                  </View>
                </View>

                {/* Page 2: Syced Lyrics */}
                <View style={[styles.pagerPage, { width: screenWidth }]}>
                  <LyricsView />
                </View>
              </ScrollView>

              {/* Pager indicators (dots) */}
              <View style={styles.indicatorRow}>
                <View style={[styles.indicatorDot, pageIndex === 0 ? { backgroundColor: colors.accent, width: 14 } : { backgroundColor: colors.textSecondary }]} />
                <View style={[styles.indicatorDot, pageIndex === 1 ? { backgroundColor: colors.accent, width: 14 } : { backgroundColor: colors.textSecondary }]} />
              </View>
            </View>

            {/* Track Info controls */}
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <RNText style={[styles.trackTitleText, { color: colors.text }]} numberOfLines={1}>
                    {currentTrack.title}
                  </RNText>
                  <RNText style={[styles.trackArtistText, { color: colors.accent }]} numberOfLines={1}>
                    {currentTrack.artist}
                  </RNText>
                </View>

                <View style={styles.actionButtons}>
                  <Pressable onPress={() => toggleFavorite(currentTrack)} style={styles.actionBtn}>
                    <AppIcon
                      ios={isFavorited ? 'heart.fill' : 'heart'}
                      android={isFavorited ? 'heart' : 'heart-outline'}
                      size={22}
                      color={isFavorited ? colors.pulseDot : colors.text}
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (activeDownloadStatus === 'idle' || activeDownloadStatus === 'downloaded') {
                        setIsDownloadSheetVisible(true);
                      }
                    }}
                    style={styles.actionBtn}
                  >
                    {activeDownloadStatus === 'idle' && (
                      <AppIcon ios="arrow.down.to.line" android="download-outline" size={22} color={colors.text} />
                    )}
                    {activeDownloadStatus === 'enqueued' && (
                      <AppIcon ios="clock" android="time-outline" size={22} color={colors.accent} />
                    )}
                    {activeDownloadStatus === 'downloading' && (
                      <View style={styles.progressContainer}>
                        <ActivityIndicator size="small" color={colors.accent} />
                        <RNText style={[styles.progressText, { color: colors.accent }]}>
                          {Math.round(currentDownloadProgress * 100)}%
                        </RNText>
                      </View>
                    )}
                    {activeDownloadStatus === 'downloaded' && (
                      <AppIcon ios="checkmark.circle.fill" android="checkmark-circle" size={22} color={colors.accent} />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Controls Section */}
            <View style={styles.controlsSection}>
              {/* Seekbar */}
              <Pressable
                onPress={handleSeekBarPress}
                onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
                style={styles.seekbarContainer}
              >
                <View style={[styles.seekbarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} pointerEvents="none">
                  <View style={[styles.seekbarFill, { backgroundColor: colors.accent, width: `${progressPercentage}%` }]} />
                </View>
              </Pressable>

              {/* Timestamps */}
              <View style={styles.timestampsRow}>
                <RNText style={[styles.timestampText, { color: colors.textSecondary }]}>{formatTime(position)}</RNText>
                <RNText style={[styles.timestampText, { color: colors.textSecondary }]}>{formatTime(duration)}</RNText>
              </View>

              {/* Playback Button Row */}
              <View style={styles.buttonRow}>
                <Pressable onPress={toggleShuffle}>
                  <AppIcon
                    ios="shuffle"
                    android="shuffle"
                    size={22}
                    color={isShuffle ? colors.accent : colors.text}
                  />
                </Pressable>

                <Pressable onPress={() => {
                  console.log(`[NowPlayingBottomSheet] 'Previous' button clicked`);
                  playPrevious();
                }}>
                  <AppIcon ios="backward.fill" android="play-back" size={32} color={colors.text} />
                </Pressable>

                <Pressable
                  onPress={togglePlay}
                  style={[styles.playPauseFAB, { backgroundColor: colors.accent }]}
                >
                  <AppIcon
                    ios={isPlaying ? 'pause.fill' : 'play.fill'}
                    android={isPlaying ? 'pause' : 'play'}
                    size={38}
                    color="#fff"
                  />
                </Pressable>

                <Pressable onPress={() => {
                  console.log(`[NowPlayingBottomSheet] 'Next' button clicked`);
                  playNext();
                }}>
                  <AppIcon ios="forward.fill" android="play-forward" size={32} color={colors.text} />
                </Pressable>

                <Pressable onPress={toggleRepeat}>
                  <AppIcon
                    ios="repeat"
                    android="repeat"
                    size={22}
                    color={isRepeat ? colors.accent : colors.text}
                  />
                </Pressable>
              </View>
            </View>

          </Animated.View>

          {/* Download sheet */}
          <DownloadSheet
            isVisible={isDownloadSheetVisible}
            onClose={() => setIsDownloadSheetVisible(false)}
            track={currentTrack}
            onStartDownload={(options) => {
              downloadTrack(currentTrack, options);
            }}
          />

          {/* Track Options Menu */}
          <TrackOptionsSheet
            isVisible={isTrackOptionsVisible}
            onClose={() => setIsTrackOptionsVisible(false)}
            track={currentTrack}
          />

        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  // Mini Player collapsed styling
  miniPlayerContent: {
    height: COLLAPSED_HEIGHT,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  miniPlayerPressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    flex: 1,
  },
  miniArt: {
    width: 42,
    height: 42,
    borderRadius: 8,
    marginRight: 10,
  },
  miniTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniArtist: {
    fontSize: 11,
  },
  miniControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  miniPlayBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniSkipBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniProgressBarBg: {
    height: 2,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  miniProgressBarFill: {
    height: '100%',
  },
  // Full player styling
  fullPlayerContent: {
    flex: 1,
    width: '100%',
  },
  dragIndicatorWrapper: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fullHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  fullHeaderArtist: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  // Pager details
  pagerContainer: {
    flex: 1,
    marginTop: 24,
    justifyContent: 'center',
  },
  scrollViewPager: {
    flex: 1,
  },
  pagerPage: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artCardContainer: {
    width: screenWidth - 72,
    height: screenWidth - 72,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artGlow: {
    position: 'absolute',
    width: screenWidth - 64,
    height: screenWidth - 64,
    borderRadius: 24,
    filter: 'blur(20px)',
  },
  albumArt: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    borderWidth: 1,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 16,
  },
  indicatorDot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
  // Track info section
  infoSection: {
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackTitleText: {
    fontSize: 22,
    fontWeight: '800',
  },
  trackArtistText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Controls
  controlsSection: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 8,
  },
  seekbarContainer: {
    height: 12,
    justifyContent: 'center',
  },
  seekbarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  seekbarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timestampsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  playPauseFAB: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  progressContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
