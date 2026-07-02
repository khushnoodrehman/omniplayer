import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Dimensions, TextInput, Text as RNText, ScrollView, ActivityIndicator, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet, RNHostView } from '@expo/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { AppIcon } from '@/components/ui/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { usePlaybackStore, Track } from '@/store/usePlaybackStore';
import MiniPlayer from '@/components/mini-player';
import { getRecentSearchesDB, addRecentSearchDB, deleteRecentSearchDB, clearAllRecentSearchesDB } from '@/services/db';

const { width: screenWidth } = Dimensions.get('window');
const columnWidth = Math.floor((screenWidth - 48) / 2);

// ⚠️ YAHAN APNE LAPTOP KA IPv4 ADDRESS LIKHO
const BACKEND_URL = 'http://192.168.43.179:5000';

// Helper to convert any backend value safely to a string for React Native Text components
const safeString = (val: any, fallback = ''): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    try {
      if (Array.isArray(val)) {
        return val.map(item => {
          if (!item) return '';
          if (typeof item === 'object') {
            return String(item.text || JSON.stringify(item));
          }
          return String(item);
        }).join('') || fallback;
      }
      if (val.text) return String(val.text);
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return String(val);
};

// Helper to format duration safely
const formatDuration = (seconds: any) => {
  try {
    const secs = parseInt(seconds, 10);
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  } catch {
    return '0:00';
  }
};

// --- BROWSE & PLAYLIST CARDS (Wese hi hain) ---
interface BrowseCardProps { title: string; colors: [string, string, ...string[]]; imageUri: string; onPress: () => void; }
const BrowseCard = ({ title, colors: gradientColors, imageUri, onPress }: BrowseCardProps) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.browseCardPressable, { width: columnWidth }, pressed && styles.pressedCard]}>
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.browseCardGradient}>
      <RNText style={styles.browseCardTitle}>{title}</RNText>
      <View style={styles.browseCardImageWrapper}>
        <Image source={{ uri: imageUri }} style={styles.browseCardImage} resizeMode="contain" />
      </View>
    </LinearGradient>
  </Pressable>
);

interface PlaylistCardProps { title: string; subtitle: string; imageUri: string; onPress: () => void; }
const PlaylistCard = ({ title, subtitle, imageUri, onPress }: PlaylistCardProps) => {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.playlistCard, { gap: 8 }]}>
      <View style={[styles.playlistImageContainer, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.playlistImageWrapper}>
          <Image source={{ uri: imageUri }} style={styles.playlistImage} resizeMode="cover" />
          <View style={[styles.playButtonOverlay, { backgroundColor: colors.accent }]}>
            <AppIcon ios="play.fill" android="play" size={18} color={colors.playIconColor} />
          </View>
        </View>
      </View>
      <View style={{ gap: 2 }}>
        <RNText style={[styles.playlistTitle, { color: colors.text }]} numberOfLines={1}>{title}</RNText>
        <RNText style={[styles.playlistSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</RNText>
      </View>
    </Pressable>
  );
};

interface FilterChipProps { label: string; isActive: boolean; onPress: () => void; }
const FilterChip = ({ label, isActive, onPress }: FilterChipProps) => {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.chipPressable, isActive ? { backgroundColor: colors.chipActive, borderColor: colors.chipActive } : { backgroundColor: colors.chipInactive, borderColor: colors.cardBorder }]}>
      <RNText style={[styles.chipText, { color: isActive ? colors.chipActiveText : colors.chipInactiveText }]}>{label}</RNText>
    </Pressable>
  );
};

interface LocalAudioItemProps { title: string; subtitle: string; onPress: () => void; onOptionsPress: () => void; }
const LocalAudioItem = ({ title, subtitle, onPress, onOptionsPress }: LocalAudioItemProps) => {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.audioItemRow, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }, pressed && { backgroundColor: colors.backgroundSelected }]}>
      <View style={[styles.audioIconWrapper, { backgroundColor: colors.audioIconBackground }]}>
        <AppIcon ios="music.note" android="musical-notes-outline" size={20} color="#00daf3" />
      </View>
      <View style={{ flex: 1 }}>
        <RNText style={[styles.audioTitle, { color: colors.text }]}>{title}</RNText>
        <RNText style={[styles.audioSubtitle, { color: colors.textSecondary }]}>{subtitle}</RNText>
      </View>
      <AppIcon ios="phone" android="phone-portrait-outline" size={16} color={colors.textSecondary} style={{ opacity: 0.4 }} />
      <View style={{ width: 12 }} />
      <Pressable onPress={onOptionsPress} style={styles.moreButton}>
        <AppIcon ios="ellipsis" android="ellipsis-vertical" size={18} color={colors.textSecondary} />
      </Pressable>
    </Pressable>
  );
};

// --- YOUTUBE ITEM (Loading State Support Ke Sath) ---
interface YouTubeItemProps {
  title: string;
  subtitle: string;
  imageUri: string;
  onPress: () => void;
  isLoading?: boolean;
  isLiked?: boolean;
  onLike?: () => void;
}
const YouTubeItem = ({ title, subtitle, imageUri, onPress, isLoading, isLiked, onLike }: YouTubeItemProps) => {
  try {
    const colors = useTheme();
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.ytItemRow, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }, pressed && { backgroundColor: colors.backgroundSelected }]}>
        <View style={styles.ytImageWrapper}>
          <Image source={{ uri: imageUri || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png' }} style={styles.ytImage} resizeMode="cover" />
          <View style={styles.ytPlayOverlay}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <AppIcon ios="play.circle" android="play-circle" size={16} color="#ffffff" />
            )}
          </View>
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <RNText style={[styles.ytTitle, { color: isLoading ? colors.accent : colors.text }]} numberOfLines={1}>{title}</RNText>
          <RNText style={[styles.ytSubtitle, { color: colors.textSecondary }]}>{subtitle}</RNText>
        </View>
        {onLike && (
          <Pressable onPress={onLike} style={{ padding: 8, marginRight: 4 }}>
            <AppIcon
              ios={isLiked ? 'heart.fill' : 'heart'}
              android={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? colors.accent : colors.textSecondary}
            />
          </Pressable>
        )}
        <Pressable onPress={() => alert('Downloading track...')} style={styles.downloadButton}>
          <AppIcon ios="arrow.down.to.line" android="download-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </Pressable>
    );
  } catch (error) {
    console.error("CRITICAL ERROR IN YOUTUBEITEM RENDER:", error);
    return null;
  }
};


export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const playTrack = usePlaybackStore((state) => state.playTrack);
  const toggleFavorite = usePlaybackStore((state) => state.toggleFavorite);
  const favoriteTracks = usePlaybackStore((state) => state.favoriteTracks);

  // UI States
  const [searchText, setSearchText] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeChip, setActiveChip] = useState('All');
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [bottomSheetData, setBottomSheetData] = useState<any>(null); // To dynamicize bottom sheet later

  // Load recent searches on mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const searches = await getRecentSearchesDB();
        setRecentSearches(searches);
      } catch (error) {
        console.error("Error loading recent searches:", error);
      }
    };
    loadRecentSearches();
  }, []);

  // API States
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState(10);


  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    // Jab user bottom se 300 pixels upar ho (yani roughly 9th item par ho)
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;

    if (isCloseToBottom && displayedCount < apiResults.length) {
      setDisplayedCount((prev) => Math.min(prev + 10, apiResults.length)); // Agle 10 add karo
    }
  };
  useEffect(() => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setApiResults([]);
      setDisplayedCount(10); // Reset
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsFetching(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = await response.json();
        if (data.results) {
          setApiResults(data.results);
          setDisplayedCount(10); // Nayi search par wapas 10 results se start karo
        }
      } catch (error) {
        console.error("Search Error:", error);
      } finally {
        setIsFetching(false);
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  const greeting = (() => {
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return 'Good Morning';
    else if (hours >= 12 && hours < 17) return 'Good Afternoon';
    else return 'Good Evening';
  })();

  // 1. YouTube Search Logic
  const handleSearchSubmit = async () => {
    const trimmed = searchText.trim();
    if (trimmed) {
      try {
        await addRecentSearchDB(trimmed);
        const searches = await getRecentSearchesDB();
        setRecentSearches(searches);
      } catch (error) {
        console.error("Error adding search query:", error);
      }
    }
  };

  // 2. Play YouTube Track Logic (Stream Extraction)
  const handlePlayYouTubeTrack = async (trackInfo: any) => {
    setLoadingTrackId(trackInfo.id);
    try {
      const response = await fetch(`${BACKEND_URL}/api/stream?id=${trackInfo.id}`);
      const data = await response.json();

      if (data.stream_url) {
        const newTrack: Track = {
          id: trackInfo.id,
          title: trackInfo.title,
          artist: trackInfo.artist,
          image: trackInfo.image,
          duration: trackInfo.duration,
          sourceType: 'youtube',
          uri: data.stream_url
        };

        // Current results ko as a queue forward karo taake Next/Prev chalen
        const queue: Track[] = apiResults
          .filter(r => r !== null && r !== undefined)
          .map(r => ({
            id: r.id || '',
            title: r.title || 'Unknown Song',
            artist: r.artist || 'Unknown Artist',
            image: r.image || '',
            duration: r.duration || 0,
            sourceType: 'youtube',
            uri: ''
          }));

        await playTrack(newTrack, queue);
      } else {
        alert("Could not load stream link.");
      }
    } catch (error) {
      console.error("Stream fetch error:", error);
      alert("Error playing track. Ensure backend is running.");
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handleRemoveSearch = async (itemToRemove: string) => {
    try {
      await deleteRecentSearchDB(itemToRemove);
      const searches = await getRecentSearchesDB();
      setRecentSearches(searches);
    } catch (error) {
      console.error("Error removing search query:", error);
    }
  };
  const handleClearAll = async () => {
    try {
      await clearAllRecentSearchesDB();
      setRecentSearches([]);
    } catch (error) {
      console.error("Error clearing search queries:", error);
    }
  };

  const isSearchingUI = searchText.length > 0;
  const topResult = apiResults.length > 0 ? apiResults[0] : null; // Dynamic top result

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        <View style={{ gap: 24 }}>

          {/* Header */}
          <View style={[styles.header, { width: screenWidth - 32, marginHorizontal: 16 }]}>
            <RNText style={[styles.headerTitle, { color: colors.text }]}>{greeting}</RNText>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => alert('Profile Details')} style={({ pressed }) => [styles.profileButton, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }, pressed && styles.pressed]}>
              <AppIcon ios="person.crop.circle.fill" android="person-circle-outline" size={28} color={colors.accent} />
            </Pressable>
          </View>

          {/* Search Input Bar */}
          <View style={[styles.searchContainer, { width: screenWidth - 32, marginHorizontal: 16 }]}>
            <View style={styles.searchIconWrapper}>
              <AppIcon ios="magnifyingglass" android="search" size={20} color={colors.textSecondary} />
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

          {!isSearchingUI ? (
            // ---------------- STATE A: DISCOVER MODE ----------------
            <>
              {/* Recent Searches */}
              <View style={{ gap: 12 }}>
                <View style={[styles.resultsSectionHeader, { paddingHorizontal: 16 }]}>
                  <RNText style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</RNText>
                  <View style={{ flex: 1 }} />
                  {recentSearches.length > 0 && (
                    <RNText style={[styles.clearAllText, { color: colors.accent }]} onPress={handleClearAll}>Clear All</RNText>
                  )}
                </View>
                <View style={{ width: screenWidth, paddingHorizontal: 16, gap: 4 }}>
                  {recentSearches.length === 0 ? (
                    <RNText style={styles.emptyText}>No recent searches</RNText>
                  ) : (
                    recentSearches.map((item, idx) => (
                      <Pressable
                        key={`${item}-${idx}`}
                        onPress={() => { setSearchText(item); handleSearchSubmit(); }}
                        style={({ pressed }) => [styles.recentSearchItem, pressed && { backgroundColor: colors.backgroundSelected }]}
                      >
                        <AppIcon ios="clock" android="time-outline" size={18} color={colors.textSecondary} />
                        <RNText style={[styles.recentSearchText, { color: colors.text }]}>{item}</RNText>
                        <View style={{ flex: 1 }} />
                        <Pressable onPress={(e) => { e.stopPropagation(); handleRemoveSearch(item); }} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                          <AppIcon ios="xmark" android="close" size={16} color={colors.textSecondary} />
                        </Pressable>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>

              {/* Browse All (Moods & Genres) Grid */}
              <View style={{ gap: 12 }}>
                <RNText style={[styles.sectionTitle, styles.sectionTitlePadding, { color: colors.text }]}>Browse All</RNText>
                <View style={{ width: screenWidth, paddingHorizontal: 16, gap: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <BrowseCard title="Desi" colors={['#4e2484', '#d7baff']} imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuBUfHUpm7tbUseJCWszBZXqPGLo863dPMxKtrMvY35C9FejTiIiWETxZpTiqwAGpDoiNlN4Fqr2zJ9PzT6zPbJDCw1arpj_tH0ztpaI3w1EPyZ8J6glEp6Zsc_HLLWf-ztxxzn5GYdoq706TRJcLdSK6amff3zNmiLp3cw5Aeso1r-gN_E_UKHUuE18O8udQHO2GZzXW_a8OUa-EwDhASX66EriZDdCPb4OkWgAfvUVlcg72_vNVK1rlB9UxqWJZeRDQSCKr4oNRNBO" onPress={() => { setSearchText('Desi Hits'); handleSearchSubmit(); }} />
                    <BrowseCard title="Workout" colors={['#00434c', '#00daf3']} imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuCJ6DODbRup1lG5P4VqPimqTj1kp6maPwlFe2aa5d3wgOl2gZPUW5PMD9nB5HkWJe9wX4IzBCUZDdeMMGqzCm9eCQcJ7z8Xcxt1wf4UE1vWdG__JE3mFQ15kTM-HulJnqBJsrMWf4EMH-gLnzuMX9wCI_6H7UuoD0UDpGuGJGatKs0KYDtYetBvkEiup9ppjqklyxVFyCf1DN01pNImN_TonFmW-A94PM5engwudFlkZfg6z31r55BTN2DY7tRUgF9CZIiZ5X902-P7" onPress={() => { setSearchText('Workout Power'); handleSearchSubmit(); }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <BrowseCard title="Lo-Fi" colors={['#93000a', '#ffb4ab']} imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuBPLnXCW7m2-veRxMrx1GIDLYFiF2OSblr8PUz1fmCfovonespXMtltgr01YToIKoIxFUi-01iM1nk7LEiStAgH9ULUQjD6fVl8_hDz4nH2NByTl5QWiqFUdlWEAa3qCr9DdNAgtZWXupykOXgAqm6RSqgjCXEABoCPG6DRHPHekgwxSHHXPuIPZ3CwakLyuO1foVdYVcMVrdkVMHZ0s0mOE26MdV15ZaigTjOlXC3HDrqdQwlFTRBfG5SelLCuduPjf4KMEnRCmUpN" onPress={() => { setSearchText('Lofi Beats'); handleSearchSubmit(); }} />
                    <BrowseCard title="Podcasts" colors={['#292a2d', '#c6c6c9']} imageUri="https://lh3.googleusercontent.com/aida-public/AB6AXuCeelEhvoff9DuqfwwoL-ujxvtfTxVHiYrFYT9QjtgYzPkCK65e5vBpWEMuT_5_pdo0reI6MC_8jdJsI38AulkV1pnTEN_Zd931tQqem_F_uEGB5nnGXDleB4ZRBjL4cfHdM80vjx0fz3dAnsnKgC8y4mUmnrhls-2DCspjggrtfnz0LiFyJ8IKLy0K0hswCyF6rVBCQuiCfm7-CoFtx_Lxu18Riyhj40LNQddcAPUcQz4b9nJ-_IiB7dBia_ixSZeWqYtKcvXzwTu9" onPress={() => { setSearchText('Tech Podcast'); handleSearchSubmit(); }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <BrowseCard title="Pop" colors={['#8F3B76', '#E07A5F']} imageUri="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop" onPress={() => { setSearchText('Pop Hits'); handleSearchSubmit(); }} />
                    <BrowseCard title="Relax" colors={['#118AB2', '#06D6A0']} imageUri="https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=400&auto=format&fit=crop" onPress={() => { setSearchText('Chill Relax'); handleSearchSubmit(); }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <BrowseCard title="Rock" colors={['#1c1c1c', '#ff2a2a']} imageUri="https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=400&auto=format&fit=crop" onPress={() => { setSearchText('Rock Anthems'); handleSearchSubmit(); }} />
                    <BrowseCard title="Focus" colors={['#3F5E6B', '#97D8C4']} imageUri="https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=80&w=400&auto=format&fit=crop" onPress={() => { setSearchText('Focus Study'); handleSearchSubmit(); }} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <BrowseCard title="Party" colors={['#E01E3C', '#FF5A5F']} imageUri="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=400&auto=format&fit=crop" onPress={() => { setSearchText('Party Hits'); handleSearchSubmit(); }} />
                    <BrowseCard title="Classical" colors={['#5c3d2e', '#b85c38']} imageUri="https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=400&auto=format&fit=crop" onPress={() => { setSearchText('Classical Instrumental'); handleSearchSubmit(); }} />
                  </View>
                </View>
              </View>
            </>
          ) : (
            // ---------------- STATE B: SEARCH RESULTS MODE ----------------
            <>
              {/* Search Filter Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.horizontalRow, { flexDirection: 'row', gap: 8 }]}>
                  {['All', 'Local', 'YouTube', 'Playlists'].map((chip) => (
                    <FilterChip key={chip} label={chip} isActive={activeChip === chip} onPress={() => setActiveChip(chip)} />
                  ))}
                </View>
              </ScrollView>

              {isFetching ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <RNText style={{ color: colors.textSecondary, marginTop: 16 }}>Searching YouTube...</RNText>
                </View>
              ) : (
                <>
                  {/* Dynamic Top Result Card */}
                  {activeChip === 'All' && topResult && (
                    <View style={{ paddingHorizontal: 16, gap: 12 }}>
                      <RNText style={[styles.resultsSectionTitle, { color: colors.accent }]}>Top Result</RNText>
                      <Pressable
                        onPress={() => handlePlayYouTubeTrack(topResult)}
                        style={({ pressed }) => [styles.topResultCard, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }, pressed && styles.pressedCard]}
                      >
                        <View style={styles.topResultRow}>
                          <View style={[styles.topResultImageContainer, { backgroundColor: colors.background }]}>
                            <Image source={{ uri: topResult.image || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png' }} style={styles.topResultImage} resizeMode="cover" />
                            {loadingTrackId === topResult.id && (
                              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                                <ActivityIndicator size="small" color="#fff" />
                              </View>
                            )}
                          </View>
                          <View style={styles.topResultTextContainer}>
                            <View style={styles.bestMatchTagRow}>
                              <View style={[styles.bestMatchTag, { backgroundColor: colors.accentLight }]}>
                                <RNText style={[styles.bestMatchTagText, { color: colors.accent }]}>YOUTUBE MATCH</RNText>
                              </View>
                            </View>
                            <RNText style={[styles.topResultSongTitle, { color: loadingTrackId === topResult.id ? colors.accent : colors.text }]} numberOfLines={2}>{safeString(topResult.title, 'Unknown Song')}</RNText>
                            <RNText style={[styles.topResultArtist, { color: colors.textSecondary }]} numberOfLines={1}>{safeString(topResult.artist, 'Unknown Artist')}</RNText>
                            <View style={styles.topResultActionsRow}>
                              <Pressable
                                onPress={() => handlePlayYouTubeTrack(topResult)}
                                style={[styles.topResultPlayButton, { backgroundColor: colors.accent }]}
                              >
                                {loadingTrackId === topResult.id ? (
                                  <ActivityIndicator size="small" color={colors.playIconColor} />
                                ) : (
                                  <AppIcon ios="play.fill" android="play" size={24} color={colors.playIconColor} />
                                )}
                              </Pressable>
                              <Pressable
                                onPress={() => toggleFavorite({
                                  id: topResult.id,
                                  title: safeString(topResult.title),
                                  artist: safeString(topResult.artist),
                                  image: safeString(topResult.image),
                                  duration: topResult.duration || 0,
                                  sourceType: 'youtube'
                                })}
                                style={[styles.topResultActionButton, { borderColor: colors.cardBorder }]}
                              >
                                <AppIcon
                                  ios={favoriteTracks.includes(topResult.id) ? 'heart.fill' : 'heart'}
                                  android={favoriteTracks.includes(topResult.id) ? 'heart' : 'heart-outline'}
                                  size={20}
                                  color={favoriteTracks.includes(topResult.id) ? colors.accent : colors.textSecondary}
                                />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      </Pressable>
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
                      </View>

                      <View style={{ gap: 8 }}>
                        {apiResults.length > 0 ? (
                          // Map API Data dynamically. Skip index 0 if it's already shown as top result in 'All'
                          apiResults.slice(activeChip === 'All' ? 1 : 0, displayedCount).map((item, index) => {
                            if (!item) return null;
                            try {
                              return (
                                <YouTubeItem
                                  key={`yt-${index}-${safeString(item.id)}`}
                                  title={safeString(item.title, 'Unknown Song')}
                                  subtitle={`${safeString(item.artist, 'Unknown Artist')} • ${formatDuration(item.duration)}`}
                                  imageUri={safeString(item.image) || 'https://cdn-icons-png.flaticon.com/512/3844/3844724.png'}
                                  onPress={() => handlePlayYouTubeTrack(item)}
                                  isLoading={loadingTrackId === item.id}
                                  isLiked={favoriteTracks.includes(item.id)}
                                  onLike={() => toggleFavorite({
                                    id: item.id,
                                    title: safeString(item.title),
                                    artist: safeString(item.artist),
                                    image: safeString(item.image),
                                    duration: item.duration || 0,
                                    sourceType: 'youtube'
                                  })}
                                />
                              );
                            } catch (err) {
                              console.error("CRITICAL ERROR IN MAP EVALUATION:", err, "ITEM:", item);
                              return null;
                            }
                          })
                        ) : (
                          <RNText style={{ color: colors.textSecondary }}>No results found for this query.</RNText>
                        )}
                      </View>
                    </View>
                  )}
                </>
              )}
            </>
          )}

          <View style={{ height: 96 }} />
        </View>
      </ScrollView>

      {/* Native bottom sheet component from @expo/ui. 
        Currently kept static for UI structure. 
      */}
      <BottomSheet isPresented={isBottomSheetVisible} onDismiss={() => setIsBottomSheetVisible(false)} snapPoints={['half']}>
        <RNHostView matchContents>
          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.sheetHeaderRow}>
              <View style={[styles.sheetAlbumArtContainer, { backgroundColor: colors.background }]}>
                <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAc_vQxJeAkEpqG1JZLU46ViOlnbdkQKsjG2CMdbTAjahaX5_JwcF3N_gfIv9cQVZqUd8YsKoTZud8ZMUWPIUAsqZS09o5724LAws2ntdxxNJ3GjuSaqmW8Sz1XMvZXy9DFQMuVv_EAWLKTE4-9iIEqP2tDYMzM47BCGIlJzdia-9Vh8yyq9i9_OsKAh60Ptbb3VxS3ZHcQJf-ZYcOnQYuGis-ndskzA2adt_7vMMb8FKh3Zp1-x9n88cQBnIrcbut1uHPQ0wvUWm5' }} style={styles.sheetAlbumArt} resizeMode="cover" />
              </View>
              <View style={styles.sheetTextContainer}>
                <RNText style={[styles.sheetSongTitle, { color: colors.text }]}>Options</RNText>
                <RNText style={[styles.sheetSongArtist, { color: colors.textSecondary }]}>Artist</RNText>
              </View>
            </View>
            <View style={[styles.sheetDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.sheetActionsList}>
              <Pressable onPress={() => { alert('Will play next'); setIsBottomSheetVisible(false); }} style={styles.sheetActionRow}>
                <AppIcon ios="rectangle.stack.badge.play" android="list" size={24} color={colors.accent} />
                <RNText style={[styles.sheetActionText, { color: colors.text }]}>Play Next</RNText>
              </Pressable>
            </View>
            <Pressable onPress={() => setIsBottomSheetVisible(false)} style={({ pressed }) => [styles.dismissButton, { backgroundColor: colors.dismissButtonBackground }, pressed && styles.pressed]}>
              <RNText style={[styles.dismissButtonText, { color: colors.accent }]}>Dismiss</RNText>
            </Pressable>
          </View>
        </RNHostView>
      </BottomSheet>
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', position: 'relative', height: 56 },
  searchIconWrapper: { position: 'absolute', left: 16, zIndex: 10 },
  searchInput: { width: screenWidth - 32, height: 56, paddingLeft: 48, paddingRight: 16, borderRadius: 28, fontSize: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionTitlePadding: { paddingHorizontal: 16 },
  clearAllText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  emptyText: { fontSize: 13, color: '#8e9196', fontStyle: 'italic', paddingVertical: 8 },
  recentSearchItem: { flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 12, borderRadius: 12, width: screenWidth - 32 },
  recentSearchText: { fontSize: 14, marginLeft: 12 },
  closeButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  pressedItem: { backgroundColor: '#1e2023' },
  browseCardPressable: { height: 112, borderRadius: 12, overflow: 'hidden' },
  browseCardGradient: { flex: 1, padding: 16, justifyContent: 'space-between', position: 'relative' },
  browseCardTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', zIndex: 10 },
  browseCardImageWrapper: { position: 'absolute', right: -8, bottom: -8, width: 64, height: 64, transform: [{ rotate: '12deg' }], opacity: 0.8 },
  browseCardImage: { width: 64, height: 64 },
  pressedCard: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  horizontalRow: { paddingHorizontal: 16 },
  playlistCard: { width: 160 },
  playlistImageContainer: { borderRadius: 12, overflow: 'hidden', width: 160, height: 160 },
  playlistImageWrapper: { position: 'relative', width: 160, height: 160 },
  playlistImage: { width: 160, height: 160 },
  playButtonOverlay: { position: 'absolute', bottom: 8, right: 8, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  playlistTitle: { fontSize: 14, fontWeight: '600' },
  playlistSubtitle: { fontSize: 12 },
  chipPressable: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  resultsSectionTitle: { fontSize: 18, fontWeight: '700' },
  resultsSectionHeader: { width: screenWidth - 32, flexDirection: 'row', alignItems: 'center' },
  resultsSectionTitleText: { fontSize: 18, fontWeight: '700' },
  resultsSectionSubtitleText: { fontSize: 12, marginLeft: 6 },
  topResultCard: { borderRadius: 24, padding: 16, borderWidth: 1, width: screenWidth - 32 },
  topResultImageContainer: { width: 120, height: 120, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  topResultImage: { width: 120, height: 120 },
  bestMatchTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  bestMatchTagText: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  topResultSongTitle: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  topResultArtist: { fontSize: 14 },
  topResultPlayButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  topResultActionButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  audioItemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, width: screenWidth - 32 },
  audioIconWrapper: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  audioTitle: { fontSize: 14, fontWeight: '600' },
  audioSubtitle: { fontSize: 11 },
  moreButton: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  pulseDotWrapper: { justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  ytItemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, width: screenWidth - 32 },
  ytImageWrapper: { width: 80, height: 56, borderRadius: 8, overflow: 'hidden', position: 'relative', marginRight: 12, backgroundColor: '#0d0e11' },
  ytImage: { width: 80, height: 56 },
  ytPlayOverlay: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },
  ytTitle: { fontSize: 14, fontWeight: '600' },
  ytSubtitle: { fontSize: 11, marginTop: 2 },
  downloadButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  bottomSheetContainer: { padding: 24, alignItems: 'center', width: screenWidth },
  sheetAlbumArtContainer: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden' },
  sheetAlbumArt: { width: 64, height: 64 },
  sheetSongTitle: { fontSize: 16, fontWeight: '600' },
  sheetSongArtist: { fontSize: 12 },
  sheetDivider: { height: 1, width: screenWidth - 48, marginVertical: 16 },
  dismissButton: { height: 48, width: screenWidth - 48, justifyContent: 'center', alignItems: 'center', borderRadius: 24, marginTop: 8 },
  dismissButtonText: { fontSize: 14, fontWeight: '600' },
  viewAllText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  topResultRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  topResultTextContainer: { flex: 1, gap: 4 },
  bestMatchTagRow: { flexDirection: 'row', alignItems: 'center' },
  topResultActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', width: screenWidth - 48, gap: 16 },
  sheetTextContainer: { flex: 1, gap: 2 },
  sheetActionsList: { width: screenWidth - 48, gap: 8, marginVertical: 16 },
  sheetActionRow: { flexDirection: 'row', alignItems: 'center', height: 48, width: '100%', gap: 16 },
  sheetActionText: { fontSize: 14, fontWeight: '500' },
});