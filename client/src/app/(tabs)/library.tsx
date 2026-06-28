import React, { useState } from 'react';
import { StyleSheet, View, Text as RNText, ScrollView, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore, Track } from '@/store/usePlaybackStore';
import { useLocalAudio } from '@/hooks/use-local-audio';
import MiniPlayer from '@/components/mini-player';

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

const tabs = ['Playlists', 'Songs', 'Artists & Albums', 'Folders'];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const router = useRouter();
  const playTrack = usePlaybackStore((state) => state.playTrack);
  const toggleFavorite = usePlaybackStore((state) => state.toggleFavorite);
  const favoriteTracks = usePlaybackStore((state) => state.favoriteTracks);
  const [activeTab, setActiveTab] = useState('Songs');

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

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 24 }}>
          {/* Header */}
          <View style={[styles.header, { width: screenWidth - 32, marginHorizontal: 16 }]}>
            <RNText style={[styles.headerTitle, { color: colors.text }]}>Your Library</RNText>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => alert('Profile Details')}
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
          </View>

          {/* Storage Indicator */}
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <RNText style={[styles.storageLabel, { color: colors.textSecondary }]}>
                Omni Player Downloads - 1.2 GB Used
              </RNText>
              <RNText style={[styles.storageFree, { color: colors.accent }]}>
                84% free
              </RNText>
            </View>
            <View style={[styles.storageBarBg, { backgroundColor: colors.divider }]}>
              <View style={[styles.storageBarFill, { backgroundColor: colors.accent, width: '16%' }]} />
            </View>
          </View>

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
                    <Pressable
                      key={track.id}
                      style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
                      // Yahan hum particular gaana aur puri queue dono bhej rahe hain
                      onPress={() => playTrack(localQueue[index], localQueue)}
                    >
                      <Image
                        source={{ uri: track.albumId ? `content://media/external/audio/albumart/${track.albumId}` : 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png' }}
                        style={styles.listItemArt}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>
                          {track.filename.replace(/\.[^/.]+$/, "")}
                        </RNText>
                        <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                          {formatDuration(track.duration)} • Local Audio
                        </RNText>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleFavorite(localQueue[index]);
                          }}
                          style={{ padding: 4 }}
                        >
                          <AppIcon
                            ios={favoriteTracks.includes(track.id) ? 'heart.fill' : 'heart'}
                            android={favoriteTracks.includes(track.id) ? 'heart' : 'heart-outline'}
                            size={20}
                            color={favoriteTracks.includes(track.id) ? colors.accent : colors.textSecondary}
                          />
                        </Pressable>
                        <Pressable onPress={(e) => {
                          e.stopPropagation();
                          alert(`Options for ${track.filename}`);
                        }} style={styles.moreButton}>
                          <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {/* Baqi Tabs Code Wese Hi Hai */}
            {activeTab === 'Playlists' && (
              <View style={{ gap: 12 }}>
                {playlists.map((playlist) => (
                  <Pressable
                    key={playlist.id}
                    style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
                    onPress={() => alert(`Opening playlist: ${playlist.title}`)}
                  >
                    <Image source={{ uri: playlist.image }} style={styles.listItemArt} contentFit="cover" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{playlist.title}</RNText>
                      <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{playlist.subtitle}</RNText>
                    </View>
                    <Pressable onPress={() => alert(`Options for playlist: ${playlist.title}`)} style={styles.moreButton}>
                      <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.textSecondary} />
                    </Pressable>
                  </Pressable>
                ))}
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
      </ScrollView>

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
});