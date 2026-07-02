import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text as RNText,
  Pressable,
  Dimensions,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheet, RNHostView } from '@expo/ui';
import { useTheme } from '@/hooks/use-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { AppIcon } from '@/components/ui/app-icon';

import * as FileSystem from 'expo-file-system/legacy';
import LyricsView from '@/components/lyrics-view';
import { downloadTrackFile } from '@/services/downloader';
import { addDownloadDB, getDownloadDB } from '@/services/db';
import { useIsPlaying, useProgress, useActiveMediaItem } from '@rntp/player';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SURFACE_CONTAINER_HIGH = '#292a2d';
const BORDER_WHITE_5 = 'rgba(255,255,255,0.05)';
const BORDER_WHITE_10 = 'rgba(255,255,255,0.10)';
const ON_SURFACE_VARIANT = '#ccc3d3';
const PRIMARY_CONTAINER = '#bd93f9';
const ON_PRIMARY_CONTAINER = '#4e2484';
const BACKEND_URL = 'http://192.168.43.179:5000';

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
    playPrevious
  } = usePlaybackStore();

  const isPlaying = useIsPlaying();
  const activeMediaItem = useActiveMediaItem();
  const { position: nativePosition, duration: nativeDuration } = useProgress(0.5);

  const isCurrentTrackLoaded = activeMediaItem?.mediaId === currentTrack?.id;
  const position = isCurrentTrackLoaded ? nativePosition : 0;
  const duration = isCurrentTrackLoaded ? nativeDuration : (currentTrack?.duration || 0);


  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'lyrics' | 'queue'>('lyrics');

  // 🌟 NAYI STATES: Download Status aur Progress ke liye
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'downloaded'>('idle');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [seekBarWidth, setSeekBarWidth] = useState(screenWidth - 32);

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
        console.error("[NowPlayingModal] Error checking download status:", err);
      }
    };
    checkDownloadStatus();
    return () => {
      active = false;
    };
  }, [currentTrack]);

  if (!currentTrack) return null;

  const isFavorited = favoriteTracks.includes(currentTrack.id);
  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const handleSeekBarPress = (e: any) => {
    const { locationX } = e.nativeEvent;
    const clickRatio = Math.max(0, Math.min(locationX / seekBarWidth, 1));
    seek(clickRatio * duration);
  };

  // 🌟 ASLI HANDLER: API call aur File System logic
  const handleStartDownload = async () => {
    if (!currentTrack) return;
    setDownloadStatus('downloading');
    setDownloadProgress(0);

    // Downloader service ko call kiya directly format 'm4a' aur progress callback ke sath
    const localUri = await downloadTrackFile(currentTrack, 'm4a', (progress) => {
      setDownloadProgress(progress);
    });

    if (localUri) {
      // Download successful
      setDownloadStatus('downloaded');

      // Fetch lyrics to store offline
      let lyrics = '';
      let lyricsType = 'none';
      try {
        const cleanArtist = currentTrack.artist.split('•')[0].trim();
        const url = `${BACKEND_URL}/api/lyrics?title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(cleanArtist)}&id=${encodeURIComponent(currentTrack.id)}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.type && data.type !== 'none') {
          lyrics = data.lyrics;
          lyricsType = data.type;
        }
      } catch (err) {
        console.error("Error fetching lyrics for offline storage:", err);
      }

      // Fetch downloaded file size client-side
      let fileSize = '';
      try {
        const fileInfo = await FileSystem.getInfoAsync(localUri);
        if (fileInfo.exists) {
          fileSize = (fileInfo.size / (1024 * 1024)).toFixed(2) + ' MB';
        }
      } catch (err) {
        console.error("Error getting file size for offline storage:", err);
      }

      // Database mein save kiya (including lyrics & file size)
      await addDownloadDB(currentTrack, localUri, fileSize, lyrics, lyricsType);
    } else {
      // Download failed
      setDownloadStatus('idle');
      setDownloadProgress(0);
      alert("Download failed. Check server logs or internet connection.");
    }
  };

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
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient
              colors={[
                'rgba(215,186,255,0.28)',
                'rgba(215,186,255,0.10)',
                'rgba(0,0,0,0)',
              ]}
              locations={[0, 0.35, 0.75]}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(189,147,249,0.18)', 'rgba(0,0,0,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', `rgba(0,218,243,0.06)`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View
            style={[
              styles.mainCanvas,
              {
                paddingTop: 8,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.sourceBadge,
                    {
                      backgroundColor: `${SURFACE_CONTAINER_HIGH}66`,
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

            <View style={styles.artSection}>
              <View style={styles.artCardContainer}>
                <View
                  style={[
                    styles.artGlow,
                    { backgroundColor: artGlowColor },
                  ]}
                />
                <Image
                  source={{ uri: currentTrack.image }}
                  style={[styles.albumArt, { borderColor: BORDER_WHITE_10 }]}
                  contentFit="cover"
                />
              </View>
            </View>

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
                    onPress={() => toggleFavorite(currentTrack)}
                    style={styles.iconButton}
                  >
                    <AppIcon
                      ios={isFavorited ? 'heart.fill' : 'heart'}
                      android={isFavorited ? 'heart' : 'heart-outline'}
                      size={22}
                      color={isFavorited ? colors.pulseDot : ON_SURFACE_VARIANT}
                    />
                  </Pressable>

                  {/* 🌟 YAHAN CHANGE KIYA HAI: Direct download & progress indicator */}
                  <Pressable
                    onPress={() => {
                      if (downloadStatus === 'idle') handleStartDownload();
                    }}
                    style={styles.iconButton}
                  >
                    {downloadStatus === 'idle' && (
                      <AppIcon
                        ios="arrow.down.to.line"
                        android="download-outline"
                        size={22}
                        color={ON_SURFACE_VARIANT}
                      />
                    )}
                    {downloadStatus === 'downloading' && (
                      <View style={styles.progressContainer}>
                        <ActivityIndicator size="small" color={colors.accent} />
                        <RNText style={[styles.progressText, { color: colors.accent }]}>
                          {Math.round(downloadProgress * 100)}%
                        </RNText>
                      </View>
                    )}
                    {downloadStatus === 'downloaded' && (
                      <AppIcon
                        ios="checkmark.circle.fill"
                        android="checkmark-circle"
                        size={22}
                        color={colors.accent}
                      />
                    )}
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.controlsSection}>
              <Pressable
                onPress={handleSeekBarPress}
                onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
                style={styles.seekbarContainer}
              >
                <View style={[styles.seekbarBg, { backgroundColor: 'rgba(204,195,211,0.20)' }]} pointerEvents="none">
                  <View
                    style={[
                      styles.seekbarFill,
                      { backgroundColor: colors.accent, width: `${progressPercentage}%` },
                    ]}
                  />
                </View>
              </Pressable>

              <View style={styles.timestampsRow}>
                <RNText style={[styles.timestampText, { color: ON_SURFACE_VARIANT }]}>
                  {formatTime(position)}
                </RNText>
                <RNText style={[styles.timestampText, { color: ON_SURFACE_VARIANT }]}>
                  {formatTime(duration)}
                </RNText>
              </View>

              <View style={styles.buttonRow}>
                <Pressable onPress={toggleShuffle}>
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

            <View style={{ flex: 1 }} />

            <Pressable
              style={styles.lyricsPeekContainer}
              onPress={() => setIsLyricsExpanded(true)}
            >
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
                  Tap to view live lyrics
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

          {isLyricsExpanded && (
            <View
              style={[
                styles.expandedDrawer,
                { paddingTop: Math.max(insets.top, 16) },
              ]}
            >
              <View style={styles.expandedDrawerGlass} />

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

              <View style={{ flex: 1 }}>
                {activeTab === 'lyrics' ? (
                  <LyricsView />
                ) : (
                  <ScrollView
                    contentContainerStyle={{ padding: 24, paddingBottom: 64 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={{ gap: 16 }}>
                      <RNText style={[styles.lyricTitle, { color: ON_SURFACE_VARIANT }]}>QUEUE</RNText>
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

                    </View>
                  </ScrollView>
                )}
              </View>
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
  progressContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  progressText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
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
  playPauseFAB: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    marginHorizontal: -16,
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
  lyricTitle: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    opacity: 0.5,
  },
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