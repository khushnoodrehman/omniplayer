import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Dimensions, TextInput, Text as RNText, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { BottomSheet, RNHostView } from '@expo/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { usePlayback } from '@/context/PlaybackContext';
import MiniPlayer from '@/components/mini-player';

const { width: screenWidth } = Dimensions.get('window');
const columnWidth = Math.floor((screenWidth - 48) / 2);

interface BrowseCardProps {
  title: string;
  colors: [string, string, ...string[]];
  imageUri: string;
  onPress: () => void;
}

const BrowseCard = ({ title, colors: gradientColors, imageUri, onPress }: BrowseCardProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.browseCardPressable,
      { width: columnWidth },
      pressed && styles.pressedCard,
    ]}
  >
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.browseCardGradient}
    >
      <RNText style={styles.browseCardTitle}>{title}</RNText>
      <View style={styles.browseCardImageWrapper}>
        <Image source={{ uri: imageUri }} style={styles.browseCardImage} contentFit="contain" />
      </View>
    </LinearGradient>
  </Pressable>
);

interface PlaylistCardProps {
  title: string;
  subtitle: string;
  imageUri: string;
  onPress: () => void;
}

const PlaylistCard = ({ title, subtitle, imageUri, onPress }: PlaylistCardProps) => {
  const colors = useTheme();
  return (
    <Pressable 
      onPress={onPress}
      style={[styles.playlistCard, { gap: 8 }]}
    >
      <View style={[styles.playlistImageContainer, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.playlistImageWrapper}>
          <Image source={{ uri: imageUri }} style={styles.playlistImage} contentFit="cover" />
          <View style={[styles.playButtonOverlay, { backgroundColor: colors.accent }]}>
            <SymbolView
              name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
              size={18}
              tintColor={colors.playIconColor}
            />
          </View>
        </View>
      </View>
      <View style={{ gap: 2 }}>
        <RNText style={[styles.playlistTitle, { color: colors.text }]} numberOfLines={1}>
          {title}
        </RNText>
        <RNText style={[styles.playlistSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </RNText>
      </View>
    </Pressable>
  );
};

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const FilterChip = ({ label, isActive, onPress }: FilterChipProps) => {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chipPressable,
        isActive 
          ? { backgroundColor: colors.chipActive, borderColor: colors.chipActive } 
          : { backgroundColor: colors.chipInactive, borderColor: colors.cardBorder },
      ]}
    >
      <RNText style={[
        styles.chipText, 
        { color: isActive ? colors.chipActiveText : colors.chipInactiveText }
      ]}>
        {label}
      </RNText>
    </Pressable>
  );
};

interface LocalAudioItemProps {
  title: string;
  subtitle: string;
  iconName: { ios: string; android: string; web: string };
  onPress: () => void;
  onOptionsPress: () => void;
}

const LocalAudioItem = ({ title, subtitle, iconName, onPress, onOptionsPress }: LocalAudioItemProps) => {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.audioItemRow,
        { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
        pressed && { backgroundColor: colors.backgroundSelected }
      ]}
    >
      <View style={[styles.audioIconWrapper, { backgroundColor: colors.audioIconBackground }]}>
        <SymbolView
          name={iconName}
          size={20}
          tintColor="#00daf3"
        />
      </View>
      <View style={{ flex: 1 }}>
        <RNText style={[styles.audioTitle, { color: colors.text }]}>{title}</RNText>
        <RNText style={[styles.audioSubtitle, { color: colors.textSecondary }]}>{subtitle}</RNText>
      </View>
      <SymbolView
        name={{ ios: 'phone', android: 'phonelink', web: 'phonelink' }}
        size={16}
        tintColor={colors.textSecondary}
        style={{ opacity: 0.4 }}
      />
      <View style={{ width: 12 }} />
      <Pressable onPress={onOptionsPress} style={styles.moreButton}>
        <SymbolView
          name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }}
          size={18}
          tintColor={colors.textSecondary}
        />
      </Pressable>
    </Pressable>
  );
};

interface YouTubeItemProps {
  title: string;
  subtitle: string;
  imageUri: string;
  onPress: () => void;
}

const YouTubeItem = ({ title, subtitle, imageUri, onPress }: YouTubeItemProps) => {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ytItemRow,
        { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
        pressed && { backgroundColor: colors.backgroundSelected }
      ]}
    >
      <View style={styles.ytImageWrapper}>
        <Image source={{ uri: imageUri }} style={styles.ytImage} contentFit="cover" />
        <View style={styles.ytPlayOverlay}>
          <SymbolView
            name={{ ios: 'play.circle', android: 'play_circle', web: 'play_circle' }}
            size={16}
            tintColor="#ffffff"
          />
        </View>
      </View>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <RNText style={[styles.ytTitle, { color: colors.text }]} numberOfLines={1}>{title}</RNText>
        <RNText style={[styles.ytSubtitle, { color: colors.textSecondary }]}>{subtitle}</RNText>
      </View>
      <Pressable onPress={() => alert('Downloading track...')} style={styles.downloadButton}>
        <SymbolView
          name={{ ios: 'arrow.down.to.line', android: 'download', web: 'download' }}
          size={20}
          tintColor={colors.textSecondary}
        />
      </Pressable>
    </Pressable>
  );
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { playTrack } = usePlayback();
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState(['Atif Aslam', 'Lofi Beats', 'Global Top 50']);
  const [activeChip, setActiveChip] = useState('All');
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const greeting = (() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) {
      return 'Good Morning';
    } else if (hours >= 12 && hours < 17) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  })();

  const handleSearchSubmit = () => {
    const trimmed = searchText.trim();
    if (trimmed) {
      setRecentSearches((prev) => {
        const filtered = prev.filter((item) => item !== trimmed);
        return [trimmed, ...filtered].slice(0, 5);
      });
    }
  };

  const handleRemoveSearch = (itemToRemove: string) => {
    setRecentSearches((prev) => prev.filter((item) => item !== itemToRemove));
  };

  const handleClearAll = () => {
    setRecentSearches([]);
  };

  const isSearching = searchText.length > 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 24 }}>
          
          {/* Header: Greeting & Profile (Matching HomeScreen) */}
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
              <SymbolView
                name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' }}
                size={28}
                tintColor={colors.accent}
              />
            </Pressable>
          </View>

          {/* Search Input Bar */}
          <View style={[styles.searchContainer, { width: screenWidth - 32, marginHorizontal: 16 }]}>
            <View style={styles.searchIconWrapper}>
              <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={20}
                tintColor={colors.textSecondary}
              />
            </View>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              placeholder="Search YouTube or Local Music..."
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
          </View>

          {/* Dynamic Rendering based on Search Text */}
          {!isSearching ? (
            // ---------------- STATE A: DISCOVER MODE ----------------
            <>
              {/* Recent Searches */}
              <View style={{ gap: 12 }}>
                <View style={[styles.resultsSectionHeader, { paddingHorizontal: 16 }]}>
                  <RNText style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</RNText>
                  <View style={{ flex: 1 }} />
                  {recentSearches.length > 0 && (
                    <RNText style={[styles.clearAllText, { color: colors.accent }]} onPress={handleClearAll}>
                      Clear All
                    </RNText>
                  )}
                </View>
                <View style={{ width: screenWidth, paddingHorizontal: 16, gap: 4 }}>
                  {recentSearches.length === 0 ? (
                    <RNText style={styles.emptyText}>No recent searches</RNText>
                  ) : (
                    recentSearches.map((item, idx) => (
                      <Pressable
                        key={`${item}-${idx}`}
                        onPress={() => setSearchText(item)}
                        style={({ pressed }) => [
                          styles.recentSearchItem,
                          pressed && { backgroundColor: colors.backgroundSelected },
                        ]}
                      >
                        <SymbolView
                          name={{ ios: 'clock', android: 'history', web: 'history' }}
                          size={18}
                          tintColor={colors.textSecondary}
                        />
                        <RNText style={[styles.recentSearchText, { color: colors.text }]}>{item}</RNText>
                        <View style={{ flex: 1 }} />
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemoveSearch(item);
                          }}
                          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
                        >
                          <SymbolView
                            name={{ ios: 'xmark', android: 'close', web: 'close' }}
                            size={16}
                            tintColor={colors.textSecondary}
                          />
                        </Pressable>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>

              {/* Browse All (Moods & Genres) Grid */}
              <View style={{ gap: 12 }}>
                <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>
                  Browse All
                </RNText>
                <View style={{ width: screenWidth, paddingHorizontal: 16, gap: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <BrowseCard
                      title="Desi"
                      colors={['#4e2484', '#d7baff']}
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuBUfHUpm7tbUseJCWszBZXqPGLo863dPMxKtrMvY35C9FejTiIiWETxZpTiqwAGpDoiNlN4Fqr2zJ9PzT6zPbJDCw1arpj_tH0ztpaI3w1EPyZ8J6glEp6Zsc_HLLWf-ztxxzn5GYdoq706TRJcLdSK6amff3zNmiLp3cw5Aeso1r-gN_E_UKHUuE18O8udQHO2GZzXW_a8OUa-EwDhASX66EriZDdCPb4OkWgAfvUVlcg72_vNVK1rlB9UxqWJZeRDQSCKr4oNRNBO"
                      onPress={() => setSearchText('Desi Hits')}
                    />
                    <BrowseCard
                      title="Workout"
                      colors={['#00434c', '#00daf3']}
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuCJ6DODbRup1lG5P4VqPimqTj1kp6maPwlFe2aa5d3wgOl2gZPUW5PMD9nB5HkWJe9wX4IzBCUZDdeMMGqzCm9eCQcJ7z8Xcxt1wf4UE1vWdG__JE3mFQ15kTM-HulJnqBJsrMWf4EMH-gLnzuMX9wCI_6H7UuoD0UDpGuGJGatKs0KYDtYetBvkEiup9ppjqklyxVFyCf1DN01pNImN_TonFmW-A94PM5engwudFlkZfg6z31r55BTN2DY7tRUgF9CZIiZ5X902-P7"
                      onPress={() => setSearchText('Workout Power')}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <BrowseCard
                      title="Lo-Fi"
                      colors={['#93000a', '#ffb4ab']}
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuBPLnXCW7m2-veRxMrx1GIDLYFiF2OSblr8PUz1fmCfovonespXMtltgr01YToIKoIxFUi-01iM1nk7LEiStAgH9ULUQjD6fVl8_hDz4nH2NByTl5QWiqFUdlWEAa3qCr9DdNAgtZWXupykOXgAqm6RSqgjCXEABoCPG6DRHPHekgwxSHHXPuIPZ3CwakLyuO1foVdYVcMVrdkVMHZ0s0mOE26MdV15ZaigTjOlXC3HDrqdQwlFTRBfG5SelLCuduPjf4KMEnRCmUpN"
                      onPress={() => setSearchText('Lofi Beats')}
                    />
                    <BrowseCard
                      title="Podcasts"
                      colors={['#292a2d', '#c6c6c9']}
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuCeelEhvoff9DuqfwwoL-ujxvtfTxVHiYrFYT9QjtgYzPkCK65e5vBpWEMuT_5_pdo0reI6MC_8jdJsI38AulkV1pnTEN_Zd931tQqem_F_uEGB5nnGXDleB4ZRBjL4cfHdM80vjx0fz3dAnsnKgC8y4mUmnrhls-2DCspjggrtfnz0LiFyJ8IKLy0K0hswCyF6rVBCQuiCfm7-CoFtx_Lxu18Riyhj40LNQddcAPUcQz4b9nJ-_IiB7dBia_ixSZeWqYtKcvXzwTu9"
                      onPress={() => setSearchText('Tech Podcast')}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <BrowseCard
                      title="Sleep"
                      colors={['#593090', '#d7baff']}
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuDh29wYeb3n_oK9qzFwCW-OZgu8U2xatqCfrHkVX-dhaPDlgo5lk4mhJYH7s32f-6kqmONgh-4qOp4UKJfBy7axLqM854_tixLHoctdgW6fjxgE1Fe9u_Kzj-d6YF80aNdR0MKVeHSee9j42hugabjp9N4DEzjPoX-Evqby4s8qJ18ApZsOfPNCpkNZWvPgCBmxOO25oJYep7xuBV3piuwhYJ4N0L7UrlAC4sgdIhvmaDJvJzuegz3zxMWgn3TUPPJBn_vZykbuyCE7"
                      onPress={() => setSearchText('Deep Sleep Ambient')}
                    />
                    <BrowseCard
                      title="Jazz"
                      colors={['#004f58', '#00daf3']}
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuAJrLuKmjOA-MOnDqJZZkNAk7h4dEUD8Kg7wbwLXagRUFWDRqZmttbwJ0VXmNyn2YxnStLxHTXSO_3eEwE85J5B56bB03p4sdG3EeRB46yB_l2DoYfjOenAmGXpOpE5Hzw5XRFGxvxSxxXrKIE1eZPCQki7uEfCuAWJbv2UBb_9CE8LeXOhBuicMzCOBvFQAxTCuv_yGyXORpQS_IsjD05q1TMobQ4JXNcHaI4cCfI8KW-TS5kwKGpECs4bIavXkEWtBqmlKSOul8N1"
                      onPress={() => setSearchText('Midnight Jazz')}
                    />
                  </View>
                </View>
              </View>

              {/* Suggested For You */}
              <View style={{ gap: 12 }}>
                <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>
                  Suggested For You
                </RNText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 16 }]}>
                    <PlaylistCard
                      title="Summer Vibes"
                      subtitle="Editorial Playlist"
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuDrCPHRwyp_exPi9aDDdnJ8cL97H2-4KSYTswpEv8S2cFZYZ9Kfk7UK7hu_-ljzpYgyEkPhUfM4FYFeqDCB6-tqDeS4mhI85_QTgElSmwF49Twp7KpDY1dqPG28TeUxFAHKDDqCDB9wzaoAWNmDSmbzCs6puvxBeD24yjt8c2Gfh1HZn1n4-fdWTaVsUsTflwtfmXXKWdEDVtfHkt0AO_Za6oiMlvZGVEyaJKpk8k8zvK-lcE-m9396UYCvdOqdkXOH7rjnmg7WOOyC"
                      onPress={() => { setSearchText('Summer Vibes'); handleSearchSubmit(); }}
                    />
                    <PlaylistCard
                      title="Midnight Drive"
                      subtitle="Your Daily Mix"
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuDqmhvfiGxd9shmGt_vcD_po4aq7GFMfCsfRG6kmWJGzq-0JZkxtDvh-J10k9lewBLLYRAJ4f67ORAXCjwIUwr2bnUmZvl0l06-ktUFV-ak38uIPwDQk-D6rZEvFlyKGxwjkxaChV46HTG8JsYQJxO3Pa56ZRbqTluCsCH2dp6vP-OrRO31MRMkE9voCkwsfMpAuvSW_MntIzKFWXOlRVjdlg8nP_5-SBrZaVl1tEDQJOk_oUP5vjPVvb5ksPEkTexDonUxA5qwLurl"
                      onPress={() => { setSearchText('Midnight Drive'); handleSearchSubmit(); }}
                    />
                    <PlaylistCard
                      title="Pure Ambient"
                      subtitle="Focus & Flow"
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuBMXKhp5uQLZ_F1QISrBtzKuB2dUzOAoQ-EUFTDigjRkIKVx1p2FqCB7U7IIhPH__P-GQBmLJmUM7M4lnsLqIrIdG4GdbQ8AYmKS1jgteSzDPu3UF0HJk08yoHb4X9f1n5CiciTxZh63rTpFCHL-5w515W0gvtIRi5Vu0vqz0JuTfBSa1AFIrT2cRlCSFCuWtZEBrFBn1c9hMlKt4XdEDt1EyBKBJcPMU0DEYFKn_9jnMit8GZZFeEZxPD9OiOqf1g-GFUFD7rPa0HI"
                      onPress={() => { setSearchText('Pure Ambient'); handleSearchSubmit(); }}
                    />
                  </View>
                </ScrollView>
              </View>
            </>
          ) : (
            // ---------------- STATE B: SEARCH RESULTS MODE ----------------
            <>
              {/* Search Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 8 }]}>
                  {['All', 'Local', 'YouTube', 'Playlists'].map((chip) => (
                    <FilterChip
                      key={chip}
                      label={chip}
                      isActive={activeChip === chip}
                      onPress={() => setActiveChip(chip)}
                    />
                  ))}
                </View>
              </ScrollView>

              {/* Top Result Card */}
              {activeChip === 'All' && (
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                  <RNText style={[styles.resultsSectionTitle, { color: colors.accent }]}>Top Result</RNText>
                  <Pressable
                    onPress={() => setIsBottomSheetVisible(true)}
                    style={({ pressed }) => [
                      styles.topResultCard, 
                      { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                      pressed && styles.pressedCard
                    ]}
                  >
                    <View style={styles.topResultRow}>
                      <View style={[styles.topResultImageContainer, { backgroundColor: colors.background }]}>
                        <Image
                          source={{
                            uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNUAqGHDp58ckGSqzENMchoeKMM8ZmjHs5zMv45I_hlZJj57CU9hdQS4NNTX8zDPJEnrzOj-Hf-DqojmXGMx1hZa8go_U6iKvbELMh0Jx4KxQ2N-RgMtHChFgPvAVtuDu7Nufs4BjTB49lpc3_da0qr4rRN8cq3mqbP5OEjp4oPSUos-90zYNn2iHLbuD9FjK0FvpVooWhljIoYiynJHgAoZJnKbcpIWQjsxtHYW_JsKFhoSIbF8DeQTw6JFsuiQjGtme_1Q0oYhT3',
                          }}
                          style={styles.topResultImage}
                          contentFit="cover"
                        />
                      </View>
                      <View style={styles.topResultTextContainer}>
                        <View style={styles.bestMatchTagRow}>
                          <View style={[styles.bestMatchTag, { backgroundColor: colors.accentLight }]}>
                            <RNText style={[styles.bestMatchTagText, { color: colors.accent }]}>BEST MATCH</RNText>
                          </View>
                        </View>
                        <RNText style={[styles.topResultSongTitle, { color: colors.text }]}>Tajdar-e-Haram</RNText>
                        <RNText style={[styles.topResultArtist, { color: colors.textSecondary }]}>Atif Aslam • Single</RNText>
                        
                        <View style={styles.topResultActionsRow}>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              playTrack({
                                id: '11',
                                title: 'Tajdar-e-Haram',
                                artist: 'Atif Aslam',
                                image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAc_vQxJeAkEpqG1JZLU46ViOlnbdkQKsjG2CMdbTAjahaX5_JwcF3N_gfIv9cQVZqUd8YsKoTZud8ZMUWPIUAsqZS09o5724LAws2ntdxxNJ3GjuSaqmW8Sz1XMvZXy9DFQMuVv_EAWLKTE4-9iIEqP2tDYMzM47BCGIlJzdia-9Vh8yyq9i9_OsKAh60Ptbb3VxS3ZHcQJf-ZYcOnQYuGis-ndskzA2adt_7vMMb8FKh3Zp1-x9n88cQBnIrcbut1uHPQ0wvUWm5',
                                duration: 618,
                                sourceType: 'local'
                              });
                            }}
                            style={[styles.topResultPlayButton, { backgroundColor: colors.accent }]}
                          >
                            <SymbolView
                              name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }}
                              size={24}
                              tintColor={colors.playIconColor}
                            />
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              alert('Added to Favorites');
                            }}
                            style={[styles.topResultActionButton, { borderColor: colors.cardBorder }]}
                          >
                            <SymbolView
                              name={{ ios: 'heart', android: 'favorite', web: 'favorite' }}
                              size={20}
                              tintColor={colors.textSecondary}
                            />
                          </Pressable>
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              alert('Shared Track');
                            }}
                            style={[styles.topResultActionButton, { borderColor: colors.cardBorder }]}
                          >
                            <SymbolView
                              name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                              size={20}
                              tintColor={colors.textSecondary}
                            />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </View>
              )}

              {/* Local Music Section */}
              {(activeChip === 'All' || activeChip === 'Local') && (
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                  <View style={styles.resultsSectionHeader}>
                    <RNText style={[styles.resultsSectionTitleText, { color: colors.text }]}>Local Audio</RNText>
                    <RNText style={[styles.resultsSectionSubtitleText, { color: colors.textSecondary }]}>(Fast Access)</RNText>
                    <View style={{ flex: 1 }} />
                    <RNText style={[styles.viewAllText, { color: colors.accent }]} onPress={() => alert('Viewing all local audio...')}>
                      VIEW ALL
                    </RNText>
                  </View>
                  
                  <View style={{ gap: 8 }}>
                    <LocalAudioItem
                      title="Pehli Dafa"
                      subtitle="Atif Aslam • 4.2 MB • MP3"
                      iconName={{ ios: 'folder.fill', android: 'folder_open', web: 'folder_open' }}
                      onPress={() => playTrack({
                        id: '12',
                        title: 'Pehli Dafa',
                        artist: 'Atif Aslam',
                        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCwN8pKTM1qe_-I7hUWfQ5fM9NfcqeQWygTl2JG92ovmv_7yHR2D0J8dzH5qdMCcHH9x9Icwq3-CugYlLu3usYNhhfzusPhuA7E53fWFKcpONaXJuvaTeGIPcoUDU62uvXQgkPGaMqh_rLM9VLLQxmr9KvQW-xiv5YNB4D8XvaxjZumAm0u0KwXBtmzYDARFY0UHLT_SCyev2R1RrfRnNlEEppYZMge05Ns_YjNnuvTbIiQqQLgsjMuMFeNb4zSol_oAugt1ebFehHT',
                        duration: 310,
                        sourceType: 'local'
                      })}
                      onOptionsPress={() => setIsBottomSheetVisible(true)}
                    />
                    <LocalAudioItem
                      title="Dil Diyan Gallan"
                      subtitle="Atif Aslam • 5.8 MB • FLAC"
                      iconName={{ ios: 'music.note', android: 'music_note', web: 'music_note' }}
                      onPress={() => playTrack({
                        id: '13',
                        title: 'Dil Diyan Gallan',
                        artist: 'Atif Aslam',
                        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuPNB6gYmZ4ytE_AY-ngGfpJczbo_AZRaq-nSEZpfSmv18XSj7cbomjV0l7KSax6nYlG5yGJT6varZ4CR3wUCTMHPWI1ZmxwzcXkBeHdGf4GX39-UafNS6a0D-vQVS2AltRUwbP47WlYWsIZtGju95yp7y7p-kleMTfm5zRIjc6dGEJHqcU_BgDlf6cq8isCOaFqFf27Cp0yYdUqwy4f7oBecRo8A2pTqiVxx30a8JjL46kmiAQn2urMbWK_flA2nV7V6qtdSXkICVo',
                        duration: 290,
                        sourceType: 'local'
                      })}
                      onOptionsPress={() => setIsBottomSheetVisible(true)}
                    />
                  </View>
                </View>
              )}

              {/* YouTube Results Section */}
              {(activeChip === 'All' || activeChip === 'YouTube') && (
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                  <View style={styles.resultsSectionHeader}>
                    <RNText style={[styles.resultsSectionTitleText, { color: colors.text }]}>YouTube Global Search</RNText>
                    <View style={styles.pulseDotWrapper}>
                      <View style={[styles.pulseDot, { backgroundColor: colors.pulseDot }]} />
                    </View>
                    <View style={{ flex: 1 }} />
                    <RNText style={[styles.viewAllText, { color: colors.accent }]} onPress={() => alert('Viewing web results...')}>
                      FULL WEB RESULTS
                    </RNText>
                  </View>
                  
                  <View style={{ gap: 8 }}>
                    <YouTubeItem
                      title="Dekhte Dekhte (Official Video)"
                      subtitle="T-Series • 4:18"
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuC6nhM7eR6zEhN0i1cq6sNBniDlvZ_cSCRA2fmNkx2EnjPThiuK3qdLX7ABcp6xGPloN518umrD7dI26kR-Z1Jq5cZyGfk95FKICfY0dskIVTw-u6kKVpWsdHxzZPpMBKy7UJn4iJw1UAI_JC4wvrBJVrqvgedjAHvAb3_nLkLVwDR6EWkguIkFrVj4qe5WvhdrbyIa-WzcLEHRJhOmRLFBzHus-oela7JTw2rR4vmjVwxETzHQpbGvSs1JWdelkGwsdeJXWfDNhdpx"
                      onPress={() => playTrack({
                        id: '14',
                        title: 'Dekhte Dekhte',
                        artist: 'Atif Aslam',
                        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6nhM7eR6zEhN0i1cq6sNBniDlvZ_cSCRA2fmNkx2EnjPThiuK3qdLX7ABcp6xGPloN518umrD7dI26kR-Z1Jq5cZyGfk95FKICfY0dskIVTw-u6kKVpWsdHxzZPpMBKy7UJn4iJw1UAI_JC4wvrBJVrqvgedjAHvAb3_nLkLVwDR6EWkguIkFrVj4qe5WvhdrbyIa-WzcLEHRJhOmRLFBzHus-oela7JTw2rR4vmjVwxETzHQpbGvSs1JWdelkGwsdeJXWfDNhdpx',
                        duration: 258,
                        sourceType: 'youtube'
                      })}
                    />
                    <YouTubeItem
                      title="Tera Hua - Love Anthem"
                      subtitle="Atif Aslam Vevo • 3:55"
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuAq1YKGJskHmmaphqnKRnzX4Z5nXN5uBHlcrGQXbG1vpRHvpdf0U7HblwA9S8bPGbvGygJb-RTB42ZbglfWSkQG1alnCveH7F30myABYGbdH3dfdXEt0oAvWOuxU2CU9VLgQoed0ELSb77HD71_2Sw9MNNfp6nB1T7NdXbghjlAcJoaJTrKJIx3KqIsife_xOTXhD-VA1Ktk_Kjc-clVdQQb2b93BrlRg3WyC1dbfSB1JniqikrjzV7Z4DSfrnu08XQmrpd5IdBOQnS"
                      onPress={() => playTrack({
                        id: '15',
                        title: 'Tera Hua',
                        artist: 'Atif Aslam',
                        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAq1YKGJskHmmaphqnKRnzX4Z5nXN5uBHlcrGQXbG1vpRHvpdf0U7HblwA9S8bPGbvGygJb-RTB42ZbglfWSkQG1alnCveH7F30myABYGbdH3dfdXEt0oAvWOuxU2CU9VLgQoed0ELSb77HD71_2Sw9MNNfp6nB1T7NdXbghjlAcJoaJTrKJIx3KqIsife_xOTXhD-VA1Ktk_Kjc-clVdQQb2b93BrlRg3WyC1dbfSB1JniqikrjzV7Z4DSfrnu08XQmrpd5IdBOQnS',
                        duration: 235,
                        sourceType: 'youtube'
                      })}
                    />
                    <YouTubeItem
                      title="O Saathi - Lyrical Video"
                      subtitle="Music Junction • 4:32"
                      imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuARelxwCqCj8LrIroTdH8J3eeJuHl0hiL4B6-gZeYN8WlO88Hfw7pnzPBzXBeRuf1K-XBieTom5dy_PWPJj1fUzzb0zR3Vy6aBGwC9WgUvLEz2m28ZzBvTdtmwqgKsHAcAMgBD3iJhERG_7udFPTzIH0EH4Q0dHGzDVJuyn9v_nCw8ZITH35d8WZMkQAAswLIPYewrxKCoXyAk1tDPstOGVm6aORXfIh1rQMpQm7-ufnEu9PP1HhB5jWkR5_cKlx8I1o9rrilYiHZgJ"
                      onPress={() => playTrack({
                        id: '16',
                        title: 'O Saathi',
                        artist: 'Atif Aslam',
                        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARelxwCqCj8LrIroTdH8J3eeJuHl0hiL4B6-gZeYN8WlO88Hfw7pnzPBzXBeRuf1K-XBieTom5dy_PWPJj1fUzzb0zR3Vy6aBGwC9WgUvLEz2m28ZzBvTdtmwqgKsHAcAMgBD3iJhERG_7udFPTzIH0EH4Q0dHGzDVJuyn9v_nCw8ZITH35d8WZMkQAAswLIPYewrxKCoXyAk1tDPstOGVm6aORXfIh1rQMpQm7-ufnEu9PP1HhB5jWkR5_cKlx8I1o9rrilYiHZgJ',
                        duration: 272,
                        sourceType: 'youtube'
                      })}
                    />
                  </View>
                </View>
              )}
            </>
          )}

          {/* Bottom Inset for Mini-player and bottom tab bar */}
          <View style={{ height: 96 }} />
        </View>
      </ScrollView>

      {/* Floating Mini Player */}
      <MiniPlayer />

      {/* Native bottom sheet component from @expo/ui - rendered OUTSIDE main Host/Scroll layout as sibling! */}
      <BottomSheet
        isPresented={isBottomSheetVisible}
        onDismiss={() => setIsBottomSheetVisible(false)}
        snapPoints={['half']}
      >
        <RNHostView matchContents>
          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.backgroundElement }]}>
            
            {/* Song Info Row */}
            <View style={styles.sheetHeaderRow}>
              <View style={[styles.sheetAlbumArtContainer, { backgroundColor: colors.background }]}>
                <Image
                  source={{
                    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAc_vQxJeAkEpqG1JZLU46ViOlnbdkQKsjG2CMdbTAjahaX5_JwcF3N_gfIv9cQVZqUd8YsKoTZud8ZMUWPIUAsqZS09o5724LAws2ntdxxNJ3GjuSaqmW8Sz1XMvZXy9DFQMuVv_EAWLKTE4-9iIEqP2tDYMzM47BCGIlJzdia-9Vh8yyq9i9_OsKAh60Ptbb3VxS3ZHcQJf-ZYcOnQYuGis-ndskzA2adt_7vMMb8FKh3Zp1-x9n88cQBnIrcbut1uHPQ0wvUWm5',
                  }}
                  style={styles.sheetAlbumArt}
                  contentFit="cover"
                />
              </View>
              <View style={styles.sheetTextContainer}>
                <RNText style={[styles.sheetSongTitle, { color: colors.text }]}>Tajdar-e-Haram</RNText>
                <RNText style={[styles.sheetSongArtist, { color: colors.textSecondary }]}>Atif Aslam</RNText>
              </View>
            </View>

            {/* Divider line */}
            <View style={[styles.sheetDivider, { backgroundColor: colors.divider }]} />

            {/* Actions list */}
            <View style={styles.sheetActionsList}>
              <Pressable
                onPress={() => {
                  alert('Tajdar-e-Haram will play next');
                  setIsBottomSheetVisible(false);
                }}
                style={styles.sheetActionRow}
              >
                <SymbolView
                  name={{ ios: 'playlist.badge.play', android: 'playlist_play', web: 'playlist_play' }}
                  size={24}
                  tintColor={colors.accent}
                />
                <RNText style={[styles.sheetActionText, { color: colors.text }]}>Play Next</RNText>
              </Pressable>

              <Pressable
                onPress={() => {
                  alert('Added Tajdar-e-Haram to Queue');
                  setIsBottomSheetVisible(false);
                }}
                style={styles.sheetActionRow}
              >
                <SymbolView
                  name={{ ios: 'plus.rectangle.on.rectangle', android: 'queue_music', web: 'queue_music' }}
                  size={24}
                  tintColor={colors.accent}
                />
                <RNText style={[styles.sheetActionText, { color: colors.text }]}>Add to Queue</RNText>
              </Pressable>

              <Pressable
                onPress={() => {
                  alert('Downloading Tajdar-e-Haram for offline use...');
                  setIsBottomSheetVisible(false);
                }}
                style={styles.sheetActionRow}
              >
                <SymbolView
                  name={{ ios: 'arrow.down.circle', android: 'download_for_offline', web: 'download_for_offline' }}
                  size={24}
                  tintColor={colors.accent}
                />
                <RNText style={[styles.sheetActionText, { color: colors.text }]}>Download for Offline</RNText>
              </Pressable>
            </View>

            {/* Dismiss Button */}
            <Pressable
              onPress={() => setIsBottomSheetVisible(false)}
              style={({ pressed }) => [
                styles.dismissButton, 
                { backgroundColor: colors.dismissButtonBackground },
                pressed && styles.pressed
              ]}
            >
              <RNText style={[styles.dismissButtonText, { color: colors.accent }]}>Dismiss</RNText>
            </Pressable>
          </View>
        </RNHostView>
      </BottomSheet>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    height: 56,
  },
  searchIconWrapper: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  searchInput: {
    width: screenWidth - 32,
    height: 56,
    paddingLeft: 48,
    paddingRight: 16,
    borderRadius: 28,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sectionTitlePadding: {
    paddingHorizontal: 16,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 13,
    color: '#8e9196',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    width: screenWidth - 32,
  },
  recentSearchText: {
    fontSize: 14,
    marginLeft: 12,
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  pressedItem: {
    backgroundColor: '#1e2023',
  },
  browseCardPressable: {
    height: 112,
    borderRadius: 12,
    overflow: 'hidden',
  },
  browseCardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    position: 'relative',
  },
  browseCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    zIndex: 10,
  },
  browseCardImageWrapper: {
    position: 'absolute',
    right: -8,
    bottom: -8,
    width: 64,
    height: 64,
    transform: [{ rotate: '12deg' }],
    opacity: 0.8,
  },
  browseCardImage: {
    width: 64,
    height: 64,
  },
  pressedCard: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  horizontalRow: {
    paddingHorizontal: 16,
  },
  playlistCard: {
    width: 160,
  },
  playlistImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 160,
    height: 160,
  },
  playlistImageWrapper: {
    position: 'relative',
    width: 160,
    height: 160,
  },
  playlistImage: {
    width: 160,
    height: 160,
  },
  playButtonOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  playlistSubtitle: {
    fontSize: 12,
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
  chipPressable: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultsSectionHeader: {
    width: screenWidth - 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsSectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
  },
  resultsSectionSubtitleText: {
    fontSize: 12,
    marginLeft: 6,
  },
  topResultCard: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    width: screenWidth - 32,
  },
  topResultImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  topResultImage: {
    width: 120,
    height: 120,
  },
  bestMatchTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestMatchTagText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  topResultSongTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  topResultArtist: {
    fontSize: 14,
  },
  topResultPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topResultActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: screenWidth - 32,
  },
  audioIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  audioSubtitle: {
    fontSize: 11,
  },
  moreButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseDotWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ytItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    width: screenWidth - 32,
  },
  ytImageWrapper: {
    width: 80,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 12,
    backgroundColor: '#0d0e11',
  },
  ytImage: {
    width: 80,
    height: 56,
  },
  ytPlayOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ytTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  ytSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  downloadButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetContainer: {
    padding: 24,
    alignItems: 'center',
    width: screenWidth,
  },
  sheetAlbumArtContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sheetAlbumArt: {
    width: 64,
    height: 64,
  },
  sheetSongTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetSongArtist: {
    fontSize: 12,
  },
  sheetDivider: {
    height: 1,
    width: screenWidth - 48,
    marginVertical: 16,
  },
  dismissButton: {
    height: 48,
    width: screenWidth - 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    marginTop: 8,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  topResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topResultTextContainer: {
    flex: 1,
    gap: 4,
  },
  bestMatchTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topResultActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: screenWidth - 48,
    gap: 16,
  },
  sheetTextContainer: {
    flex: 1,
    gap: 2,
  },
  sheetActionsList: {
    width: screenWidth - 48,
    gap: 8,
    marginVertical: 16,
  },
  sheetActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    width: '100%',
    gap: 16,
  },
  sheetActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
