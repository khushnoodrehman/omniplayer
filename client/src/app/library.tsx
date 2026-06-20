import React, { useState } from 'react';
import { StyleSheet, View, Text as RNText, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { usePlayback } from '@/context/PlaybackContext';
import MiniPlayer from '@/components/mini-player';

const { width: screenWidth } = Dimensions.get('window');

const libraryTracks = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83 • Hurry Up, We\'re Dreaming',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfDQPHqfdMWlnSFtNGjCGU2tsWf_TpMUmYCWaSEAj5TsUK_i9A7JdDXSjHiPVmzRTUf5lfxN7qDA7Xc6SEbew2B40CWecdj5gCSFA8mLnPkNUuisIyCEuypQdDUNMaN_tjacAB2opATgHvFuoepOiAdu9gFMvsxhPyxA3QrOINSuch9Xol67oCmpM90EbKwTvcvj1peKsrojgjZpfCxeeMlBnf91TtHn9hudRUOIyVCIeLGPT8Z3vwIcfEVKG41F01pHVVpVK6W2ho',
    icon: { ios: 'cloud', android: 'cloud', web: 'cloud' },
    iconColor: '#00daf3',
    duration: 275,
    sourceType: 'local' as const,
  },
  {
    id: '2',
    title: 'Starboy',
    artist: 'The Weeknd • Starboy',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuPNB6gYmZ4ytE_AY-ngGfpJczbo_AZRaq-nSEZpfSmv18XSj7cbomjV0l7KSax6nYlG5yGJT6varZ4CR3wUCTMHPWI1ZmxwzcXkBeHdGf4GX39-UafNS6a0D-vQVS2AltRUwbP47WlYWsIZtGju95yp7y7p-kleMTfm5zRIjc6dGEJHqcU_BgDlf6cq8isCOaFqFf27Cp0yYdUqwy4f7oBecRo8A2pTqiVxx30a8JjL46kmiAQn2urMbWK_flA2nV7V6qtdSXkICVo',
    icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
    iconColor: '#10b981',
    duration: 230,
    sourceType: 'local' as const,
  },
  {
    id: '3',
    title: 'Street Lights',
    artist: 'Urban Echo • City Solitude',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDe2eOHSmGVHVgwN8BW87ThQ-Gn-W6yvxVBVz7Z73wa12K9UvTU583TSK4Sr0_KqnxW_sCiG-oa5o0z-hb1Ri2ZphGXDKohrb5D_sCFuj3-o7MxPqauz3d8Gtw7UqNOo4lfo56M4vaVCpcPEfqMLFqMATlDUqCRvKQks6BrbesWvps7nuFWFaWhiQl632mBtXlDiW40oZFO5Raj3bFotAtOS49Anr9colPSSCGoW9VSMrjRiZ_S-aHAarPI1DokE4GC855IVIG2scl5',
    icon: { ios: 'folder', android: 'folder', web: 'folder' },
    iconColor: 'SECONDARY',
    duration: 200,
    sourceType: 'local' as const,
  },
  {
    id: '4',
    title: 'Neon Waves',
    artist: 'Synth Master • Pulse Era',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAhiDaJBu3TOQiX-rFRXUmj_rx6QfML7y9fwwmsWYyoxWwuJbMylxox0WUhpVuyMycPMhYBmlYOfNAG-_AdAseGWSC8xInRVcySmUCQvommSzL_W9Dlg6ntAiBfsSeG3A9uFF3Uh65WM3eP-cPVdapGQRY3f_WXfEhkzKdRYc6idz1ndp0ORCnxtS2aW7LfhOOeJgt2kcI-GBhFsKy3CA4xsgzgfBfqSZO_sE9ioKovrzA0RUNdxORXuuKYIE1UmIPWJ_00SsGd4TNi',
    icon: { ios: 'folder', android: 'folder', web: 'folder' },
    iconColor: 'SECONDARY',
    duration: 215,
    sourceType: 'local' as const,
  },
];

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
  const { playTrack } = usePlayback();
  const [activeTab, setActiveTab] = useState('Songs');

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 24 }}>
          {/* Header: Greeting & Profile (Matching HomeScreen style exactly, with Your Library title) */}
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
              <SymbolView 
                name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' }} 
                size={28} 
                tintColor={colors.accent} 
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
            {activeTab === 'Songs' && (
              <View style={{ gap: 12 }}>
                {libraryTracks.map((track) => (
                  <Pressable 
                    key={track.id}
                    style={[styles.listItem, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}
                    onPress={() => playTrack({
                      id: track.id,
                      title: track.title,
                      artist: track.artist,
                      image: track.image,
                      duration: track.duration,
                      sourceType: track.sourceType
                    })}
                  >
                    <Image source={{ uri: track.image }} style={styles.listItemArt} contentFit="cover" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{track.title}</RNText>
                      <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{track.artist}</RNText>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <SymbolView 
                        name={track.icon} 
                        size={20} 
                        tintColor={track.iconColor === 'SECONDARY' ? colors.textSecondary : track.iconColor} 
                      />
                      <Pressable onPress={() => alert(`Options for ${track.title}`)} style={styles.moreButton}>
                        <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={20} tintColor={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

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
                      <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={20} tintColor={colors.textSecondary} />
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
                      <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={20} tintColor={colors.textSecondary} />
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
                      <SymbolView name={{ ios: 'folder', android: 'folder', web: 'folder' }} size={22} tintColor={colors.accent} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <RNText style={[styles.listItemTitle, { color: colors.text }]} numberOfLines={1}>{folder.title}</RNText>
                      <RNText style={[styles.listItemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{folder.subtitle}</RNText>
                    </View>
                    <Pressable onPress={() => alert(`Options for folder: ${folder.title}`)} style={styles.moreButton}>
                      <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={20} tintColor={colors.textSecondary} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Bottom padding spacer to clear the floating player */}
          <View style={{ height: 96 }} />
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable 
        style={({ pressed }) => [
          styles.fab, 
          { backgroundColor: colors.accent },
          pressed && styles.pressed
        ]}
        onPress={() => alert('Add to Library options')}
      >
        <SymbolView 
          name={{ ios: 'plus', android: 'add', web: 'add' }} 
          size={24} 
          tintColor={colors.playIconColor} 
        />
      </Pressable>

      {/* Floating Mini Player */}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 0,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  storageLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  storageFree: {
    fontSize: 12,
    fontWeight: '600',
  },
  storageBarBg: {
    height: 4,
    borderRadius: 2,
    width: '100%',
    overflow: 'hidden',
  },
  storageBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabButton: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: screenWidth - 32,
    gap: 12,
  },
  listItemArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  listItemArtRound: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  folderIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  listItemSubtitle: {
    fontSize: 12,
  },
  moreButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 84,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 90,
  },
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
  progressBarBg: {
    height: 3,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    width: '0%',
  },
});
