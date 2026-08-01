import { AppIcon } from '@/components/ui/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { BottomSheet, RNHostView } from '@expo/ui';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  Text as RNText,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DownloadSheet from '@/components/download-sheet';
import LyricsView from '@/components/lyrics-view';
import TrackOptionsSheet from '@/components/track-options-sheet';
import { getDownloadDB } from '@/services/db';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system/legacy';

const { width: screenWidth } = Dimensions.get('window');

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
    position,
    duration,
    downloadQueue,
    currentDownloadingTrackId,
    currentLyrics,
  } = usePlaybackStore();

  const [pageIndex, setPageIndex] = useState(0);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Dynamic Theme Colors
  const textColor = isDark ? '#ffffff' : '#1e2023';
  const textSecondaryColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(30, 32, 35, 0.7)';
  const iconColor = isDark ? '#ffffff' : '#1e2023';
  const iconSubduedColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(30, 32, 35, 0.6)';
  const playBtnBg = isDark ? '#ffffff' : colors.accent;
  const playBtnIconColor = isDark ? '#1e2023' : '#ffffff';

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / screenWidth);
    if (page !== pageIndex) {
      setPageIndex(page);
    }
  };

  const getActiveLyricLine = () => {
    if (!currentLyrics || currentLyrics.length === 0 || position === undefined) return '';
    let activeLine = '';
    for (let i = 0; i < currentLyrics.length; i++) {
      if (position >= currentLyrics[i].time) {
        activeLine = currentLyrics[i].text;
      } else {
        break;
      }
    }
    return activeLine;
  };
  const activeLyricText = getActiveLyricLine();

  const getCleanArtistName = (rawArtist: string) => {
    if (!rawArtist) return '';
    const parts = rawArtist.split('•').map(p => p.trim());
    let clean = parts[0] || '';
    if ((clean.toLowerCase() === 'song' || clean.toLowerCase() === 'video') && parts.length > 1) {
      clean = parts[1];
    }
    return clean.replace(/\s*-\s*topic/gi, '').replace(/vevo$/gi, '').trim();
  };
  const displayArtist = getCleanArtistName(currentTrack?.artist || '');

  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'downloaded'>('idle');
  const [isDownloadSheetVisible, setIsDownloadSheetVisible] = useState(false);
  const [isTrackOptionsVisible, setIsTrackOptionsVisible] = useState(false);
  const [seekBarWidth, setSeekBarWidth] = useState(screenWidth - 82);

  useEffect(() => {
    let active = true;
    const checkDownloadStatus = async () => {
      if (!currentTrack) return;
      try {
        const download = await getDownloadDB(currentTrack.id);
        if (download && download.localPath) {
          const fileInfo = await FileSystem.getInfoAsync(download.localPath);
          if (fileInfo.exists && active) {
            setDownloadStatus('downloaded');
            return;
          }
        }
        if (active) setDownloadStatus('idle');
      } catch {
        if (active) setDownloadStatus('idle');
      }
    };
    checkDownloadStatus();
    return () => { active = false; };
  }, [currentTrack?.id]);

  if (!currentTrack) return null;

  const isFavorited = favoriteTracks.includes(currentTrack.id);
  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const isDownloadingThis = currentDownloadingTrackId === currentTrack.id;
  const isEnqueuedThis = downloadQueue.some((t) => t.id === currentTrack.id);

  let activeDownloadStatus: 'idle' | 'enqueued' | 'downloading' | 'downloaded' = downloadStatus;
  if (isDownloadingThis) {
    activeDownloadStatus = 'downloading';
  } else if (isEnqueuedThis) {
    activeDownloadStatus = 'enqueued';
  }

  const handleSeekBarPress = (e: any) => {
    if (duration <= 0 || seekBarWidth <= 0) return;
    const touchX = e.nativeEvent.locationX;
    const percentage = Math.max(0, Math.min(1, touchX / seekBarWidth));
    const newPosition = percentage * duration;
    seek(newPosition);
  };

  return (
    <BottomSheet
      isPresented={isPlayerVisible}
      onDismiss={() => setPlayerVisible(false)}
      snapPoints={['full']}
      showDragIndicator={true}
    >
      <RNHostView matchContents>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Image
              source={{ uri: currentTrack.image }}
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
              contentFit="cover"
              blurRadius={70}
            />
            <BlurView intensity={100} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.65)' }} />
          </View>

          <View
            style={[
              styles.mainCanvas,
              {
                paddingTop: 8,
                paddingBottom: Math.max(insets.bottom, 24),
              },
            ]}
          >
            {/* Top Bar */}
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Pressable
                  onPress={() => setPlayerVisible(false)}
                  style={styles.headerMenuButton}
                >
                  <AppIcon
                    ios="chevron.down"
                    android="chevron-down"
                    size={24}
                    color={iconColor}
                  />
                </Pressable>

                {/* Pager indicators (dots) */}
                <View style={styles.topIndicatorRow}>
                  <View style={[styles.indicatorDot, { backgroundColor: iconColor, opacity: pageIndex === 0 ? 1 : 0.3 }]} />
                  <View style={[styles.indicatorDot, { backgroundColor: iconColor, opacity: pageIndex === 1 ? 1 : 0.3 }]} />
                </View>

                <Pressable
                  onPress={() => setIsTrackOptionsVisible(true)}
                  style={styles.headerMenuButton}
                >
                  <AppIcon
                    ios="ellipsis"
                    android="ellipsis-vertical"
                    size={22}
                    color={iconColor}
                  />
                </Pressable>
              </View>
            </View>

            {/* 🌟 SWIPEABLE PAGER */}
            <View style={styles.pagerContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.scrollViewPager}
              >
                {/* Page 1: Album Art & Metadata */}
                <View style={[styles.pagerPage, { width: screenWidth }]}>
                  <View style={styles.artSection}>
                    <View style={styles.artCardContainer}>
                      <Image
                        source={{ uri: currentTrack.image }}
                        style={[styles.albumArt, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                        contentFit="cover"
                      />
                    </View>
                  </View>

                  <View style={styles.metadataContainer}>
                    <View style={styles.infoRow}>
                      <View style={{ flex: 1 }}>
                        <RNText style={[styles.trackTitle, { color: textColor }]} numberOfLines={1}>
                          {currentTrack.title}
                        </RNText>
                        <RNText style={[styles.trackArtist, { color: textSecondaryColor }]} numberOfLines={1}>
                          {displayArtist}
                        </RNText>
                      </View>
                      <Pressable
                        onPress={() => toggleFavorite(currentTrack)}
                        style={styles.iconButton}
                      >
                        <AppIcon
                          ios={isFavorited ? 'heart.fill' : 'heart'}
                          android={isFavorited ? 'heart' : 'heart-outline'}
                          size={24}
                          color={isFavorited ? colors.accent : iconSubduedColor}
                        />
                      </Pressable>
                    </View>

                    <RNText style={[styles.activeLyricLineText, { color: textSecondaryColor }]} numberOfLines={1}>
                      {activeLyricText ? `(${activeLyricText})` : ' '}
                    </RNText>

                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => {
                          if (activeDownloadStatus === 'idle' || activeDownloadStatus === 'downloaded') {
                            setIsDownloadSheetVisible(true);
                          }
                        }}
                        style={styles.actionIconButton}
                      >
                        {activeDownloadStatus === 'idle' && (
                          <AppIcon ios="arrow.down.to.line" android="download-outline" size={22} color={iconSubduedColor} />
                        )}
                        {activeDownloadStatus === 'enqueued' && (
                          <AppIcon ios="clock" android="time-outline" size={22} color={colors.accent} />
                        )}
                        {activeDownloadStatus === 'downloading' && (
                          <ActivityIndicator size="small" color={colors.accent} />
                        )}
                        {activeDownloadStatus === 'downloaded' && (
                          <AppIcon ios="checkmark.circle.fill" android="checkmark-circle" size={22} color={colors.accent} />
                        )}
                      </Pressable>

                      <View style={[styles.sourceBadgeInline, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                        <AppIcon
                          ios="folder.fill"
                          android="folder-open-outline"
                          size={12}
                          color={iconSubduedColor}
                        />
                        <RNText style={[styles.sourceBadgeInlineText, { color: textSecondaryColor }]}>
                          {currentTrack.sourceType === 'local' ? 'Local' : 'YouTube'}
                        </RNText>
                      </View>

                      <Pressable
                        onPress={() => setIsTrackOptionsVisible(true)}
                        style={styles.actionIconButton}
                      >
                        <AppIcon ios="ellipsis" android="ellipsis-vertical" size={22} color={iconSubduedColor} />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Page 2: Lyrics */}
                <View style={[styles.pagerPage, { width: screenWidth }]}>
                  <View style={styles.lyricsPageHeader}>
                    <RNText style={[styles.lyricsPageTitle, { color: textColor }]} numberOfLines={1}>
                      {currentTrack.title}
                    </RNText>
                    <RNText style={[styles.lyricsPageArtist, { color: textSecondaryColor }]} numberOfLines={1}>
                      {displayArtist}
                    </RNText>
                    <RNText style={[styles.lyricsPageActiveLyric, { color: colors.accent }]} numberOfLines={1}>
                      {activeLyricText ? `(${activeLyricText})` : ' '}
                    </RNText>
                  </View>
                  <View style={{ flex: 1, width: '100%' }}>
                    <LyricsView />
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* STATIC BOTTOM SECTION */}
            <View style={styles.bottomSection}>
              <View style={styles.seekbarRow}>
                <RNText style={[styles.timestampTextHuawei, { color: textSecondaryColor }]}>{formatTime(position)}</RNText>
                <Pressable
                  onPress={handleSeekBarPress}
                  onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
                  style={styles.seekbarContainerInline}
                >
                  <View style={[styles.seekbarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }]}>
                    <View style={[styles.seekbarFill, { backgroundColor: colors.accent, width: `${progressPercentage}%` }]} />
                  </View>
                </Pressable>
                <RNText style={[styles.timestampTextHuawei, { color: textSecondaryColor }]}>{formatTime(duration)}</RNText>
              </View>

              <View style={styles.buttonRow}>
                <Pressable onPress={toggleShuffle}>
                  <AppIcon ios="shuffle" android="shuffle" size={22} color={isShuffle ? colors.accent : iconSubduedColor} />
                </Pressable>
                <Pressable onPress={() => playPrevious()}>
                  <AppIcon ios="backward.fill" android="play-back" size={30} color={iconColor} />
                </Pressable>
                <Pressable
                  onPress={togglePlay}
                  style={[styles.playPauseButtonHuawei, { backgroundColor: playBtnBg }]}
                >
                  <AppIcon ios={isPlaying ? 'pause.fill' : 'play.fill'} android={isPlaying ? 'pause' : 'play'} size={36} color={playBtnIconColor} />
                </Pressable>
                <Pressable onPress={() => playNext()}>
                  <AppIcon ios="forward.fill" android="play-forward" size={30} color={iconColor} />
                </Pressable>
                <Pressable onPress={toggleRepeat}>
                  <AppIcon ios="repeat" android="repeat" size={22} color={isRepeat ? colors.accent : iconSubduedColor} />
                </Pressable>
              </View>
            </View>
          </View>

          <DownloadSheet
            isVisible={isDownloadSheetVisible}
            onClose={() => setIsDownloadSheetVisible(false)}
            track={currentTrack}
          />

          <TrackOptionsSheet
            isVisible={isTrackOptionsVisible}
            onClose={() => setIsTrackOptionsVisible(false)}
            track={currentTrack}
          />
        </View>
      </RNHostView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mainCanvas: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  headerMenuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  artSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  artCardContainer: {
    width: screenWidth - 72,
    height: screenWidth - 72,
    maxWidth: 320,
    maxHeight: 320,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  albumArt: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
  },
  metadataContainer: {
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  trackArtist: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeLyricLineText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'left',
    marginVertical: 12,
    minHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  actionIconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceBadgeInlineText: {
    fontSize: 10,
    fontWeight: '600',
  },
  lyricsPageHeader: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 12,
    paddingHorizontal: 24,
    width: '100%',
  },
  lyricsPageTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  lyricsPageArtist: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  lyricsPageActiveLyric: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  pagerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  scrollViewPager: {
    flex: 1,
    width: '100%',
  },
  pagerPage: {
    height: '100%',
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 24,
  },
  seekbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  seekbarContainerInline: {
    flex: 1,
    paddingVertical: 12,
  },
  seekbarBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  seekbarFill: {
    height: '100%',
    borderRadius: 2,
  },
  timestampTextHuawei: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.4,
    minWidth: 32,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    marginBottom: 36,
  },
  playPauseButtonHuawei: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});