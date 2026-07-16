import React from 'react';
import { StyleSheet, View, Text as RNText, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { AppIcon } from '@/components/ui/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';

const { width: screenWidth } = Dimensions.get('window');
const miniPlayerWidth = screenWidth - 32;

export default function MiniPlayer() {
  const colors = useTheme();
  const {
    currentTrack,
    togglePlay,
    setPlayerVisible,
    playNext,
    playPrevious,
    isPlaying,
    position,
    duration,
  } = usePlaybackStore();

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

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  const handlePress = () => {
    if (currentTrack) {
      setPlayerVisible(true);
    } else {
      alert('Select a track to start playing');
    }
  };

  return (
    <Pressable
      style={styles.miniPlayerContainer}
      onPress={handlePress}
    >
      <View style={[
        styles.miniPlayerRow,
        {
          width: miniPlayerWidth,
          backgroundColor: colors.miniPlayerBackground,
          borderColor: colors.cardBorder
        }
      ]}>
        {currentTrack ? (
          <View style={styles.miniPlayerArtContainer}>
            <Image
              source={{ uri: currentTrack.image }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          </View>
        ) : (
          <View style={[styles.miniPlayerIconWrapper, { backgroundColor: colors.accentLight }]}>
            <AppIcon ios="music.note" android="musical-notes-outline" size={18} color={colors.accent} />
          </View>
        )}

        <View style={{ flexDirection: 'column', gap: 2, flex: 1, marginRight: 8 }}>
          <RNText style={[styles.miniPlayerTitle, { color: colors.text }]} numberOfLines={1}>
            {currentTrack ? currentTrack.title : 'Not Playing'}
          </RNText>
          <RNText style={[styles.miniPlayerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {currentTrack ? displayArtist : 'Select a track to start'}
          </RNText>
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              console.log(`[MiniPlayer] 'Previous' button clicked at timestamp ${Date.now()}`);
              playPrevious();
            }}
            style={({ pressed }) => [styles.miniPlayerControlButton, pressed && styles.pressed]}
          >
            <AppIcon
              ios="backward.fill"
              android="play-skip-back"
              size={20}
              color={colors.text}
            />
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            style={({ pressed }) => [styles.miniPlayerPlayButton, pressed && styles.pressed]}
          >
            <AppIcon
              ios={isPlaying ? 'pause.fill' : 'play.fill'}
              android={isPlaying ? 'pause' : 'play'}
              size={26}
              color={colors.text}
            />
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              console.log(`[MiniPlayer] 'Next' button clicked at timestamp ${Date.now()}`);
              playNext();
            }}
            style={({ pressed }) => [styles.miniPlayerControlButton, pressed && styles.pressed]}
          >
            <AppIcon
              ios="forward.fill"
              android="play-skip-forward"
              size={20}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBarBg, { backgroundColor: colors.divider }]}>
        <View style={[styles.progressBarFill, { backgroundColor: colors.accent, width: `${progressPercentage}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    zIndex: 100,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  miniPlayerRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniPlayerIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  miniPlayerArtContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 10,
  },
  hiddenArtPlaceholder: {
    opacity: 0,
  },
  artImageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  miniPlayerTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  miniPlayerSubtitle: {
    fontSize: 10,
  },
  miniPlayerPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayerControlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  progressBarBg: {
    height: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
});
