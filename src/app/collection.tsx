import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text as RNText, Pressable, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';

import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore, Track } from '@/store/usePlaybackStore';
import { getFavoritesDB, getDownloadsDB, removeDownloadDB, removeFavoriteDB } from '@/services/db';

const { width: screenWidth } = Dimensions.get('window');

// Helper to format duration
const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function CollectionScreen() {
    const insets = useSafeAreaInsets();
    const colors = useTheme();
    const router = useRouter();

    // Params se check karenge ke 'liked' khula hai ya 'downloads'
    const { type } = useLocalSearchParams<{ type: string }>();
    const isLiked = type === 'liked';

    const playTrack = usePlaybackStore((state) => state.playTrack);
    const favoriteTracks = usePlaybackStore((state) => state.favoriteTracks);

    const [tracks, setTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFullAbout, setShowFullAbout] = useState(false);

    // Screen meta data based on type
    const collectionTitle = isLiked ? 'Liked' : 'Downloads';
    const collectionIcon = isLiked ? 'heart.fill' : 'arrow.down.circle.fill';
    const androidIcon = isLiked ? 'heart' : 'download';
    // Fallback beautiful images for the header
    const coverImage = isLiked
        ? 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop' // A beautiful aesthetic cover for likes
        : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop'; // A cool abstract cover for downloads

    useEffect(() => {
        const fetchCollection = async () => {
            setIsLoading(true);
            try {
                if (isLiked) {
                    const favs = await getFavoritesDB();
                    setTracks(favs);
                } else {
                    const dls = await getDownloadsDB();
                    setTracks(dls);
                }
            } catch (error) {
                console.error("Error fetching collection:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCollection();
    }, [type, favoriteTracks]); // favoriteTracks dependency taake real-time update ho jab dil pe click ho

    const handleDeleteTrack = async (track: Track) => {
        try {
            await removeDownloadDB(track.id);
            if (track.uri) {
                const fileInfo = await FileSystem.getInfoAsync(track.uri);
                if (fileInfo.exists) {
                    await FileSystem.deleteAsync(track.uri);
                    console.log(`[Collection] Deleted track file from disk: ${track.uri}`);
                }
            }
            setTracks((prev) => prev.filter((t) => t.id !== track.id));
        } catch (error) {
            console.error("Error deleting track:", error);
            Alert.alert("Error", "Failed to delete the track file.");
        }
    };

    const handleTrackOptions = (track: Track) => {
        if (!isLiked) {
            Alert.alert(
                "Delete Download",
                `Are you sure you want to delete "${track.title}" from your device?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Delete", 
                        style: "destructive", 
                        onPress: () => handleDeleteTrack(track) 
                    }
                ]
            );
        } else {
            Alert.alert(
                "Remove Favorite",
                `Remove "${track.title}" from Liked Songs?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Remove", 
                        style: "destructive", 
                        onPress: async () => {
                            await removeFavoriteDB(track.id);
                            setTracks((prev) => prev.filter((t) => t.id !== track.id));
                        } 
                    }
                ]
            );
        }
    };

    const totalDuration = tracks.reduce((acc, track) => acc + (track.duration || 0), 0);
    const formattedTotalDuration = formatDuration(totalDuration);

    const handlePlayAll = () => {
        if (tracks.length > 0) {
            playTrack(tracks[0], tracks);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Hide default Expo Router header */}
            <Stack.Screen options={{ headerShown: false }} />

            {/* ── Custom Header ── */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <AppIcon ios="arrow.left" android="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <RNText style={[styles.headerTitle, { color: colors.text }]}>{collectionTitle}</RNText>
                <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <AppIcon ios="magnifyingglass" android="search" size={24} color={colors.text} />
                </Pressable>
            </View>

            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* ── Large Cover Art ── */}
                    <View style={styles.coverArtContainer}>
                        <Image source={{ uri: tracks.length > 0 && tracks[0].image ? tracks[0].image : coverImage }} style={styles.coverArt} contentFit="cover" />
                    </View>

                    {/* ── Title Row ── */}
                    <View style={styles.titleRow}>
                        <AppIcon ios={collectionIcon} android={androidIcon} size={28} color={isLiked ? colors.accent : colors.text} />
                        <RNText style={[styles.mainTitle, { color: colors.text }]}>{collectionTitle}</RNText>
                    </View>

                    {/* ── Action Buttons ── */}
                    <View style={styles.actionRow}>
                        <Pressable style={({ pressed }) => [styles.secondaryButton, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}>
                            <AppIcon ios="shuffle" android="shuffle" size={18} color={colors.text} />
                            <RNText style={[styles.secondaryButtonText, { color: colors.text }]}>Shuffle</RNText>
                        </Pressable>

                        <Pressable onPress={handlePlayAll} style={({ pressed }) => [styles.playButton, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
                            <AppIcon ios="play.fill" android="play" size={20} color={colors.playIconColor || '#fff'} />
                            <RNText style={[styles.playButtonText, { color: colors.playIconColor || '#fff' }]}>Play</RNText>
                        </Pressable>

                        <Pressable style={({ pressed }) => [styles.circleButton, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}>
                            <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.text} />
                        </Pressable>
                    </View>

                    {/* ── Stats & About ── */}
                    <View style={styles.metaContainer}>
                        <RNText style={[styles.metaText, { color: colors.textSecondary }]}>
                            {tracks.length} songs • {formattedTotalDuration}
                        </RNText>

                        <RNText style={[styles.aboutTitle, { color: colors.text }]}>About</RNText>
                        <RNText style={[styles.aboutText, { color: colors.textSecondary }]} numberOfLines={showFullAbout ? undefined : 3}>
                            {collectionTitle} is a personalized collection featuring {tracks.length} songs. Total listening time is {formattedTotalDuration}. This playlist is automatically curated for your musical enjoyment based on your {isLiked ? 'preferences' : 'offline downloads'}.
                        </RNText>
                        <Pressable onPress={() => setShowFullAbout(!showFullAbout)} style={styles.toggleAboutButton}>
                            <RNText style={[styles.toggleAboutText, { backgroundColor: colors.backgroundElement, color: colors.text }]}>
                                {showFullAbout ? 'Less' : 'More'}
                            </RNText>
                        </Pressable>
                    </View>

                    {/* ── Filter / Sort ── */}
                    <View style={styles.filterRow}>
                        <Pressable style={[styles.filterChip, { backgroundColor: colors.backgroundElement }]}>
                            <RNText style={[styles.filterChipText, { color: colors.text }]}>Date added</RNText>
                        </Pressable>
                        <Pressable style={[styles.circleButtonSmall, { backgroundColor: colors.backgroundElement }]}>
                            <AppIcon ios="chevron.up" android="chevron-up" size={16} color={colors.text} />
                        </Pressable>
                    </View>

                    {/* ── Track List ── */}
                    <View style={styles.trackList}>
                        {tracks.length === 0 ? (
                            <View style={styles.emptyState}>
                                <RNText style={{ color: colors.textSecondary }}>No {type} tracks yet.</RNText>
                            </View>
                        ) : (
                            tracks.map((track, index) => (
                                <Pressable
                                    key={`${track.id}-${index}`}
                                    onPress={() => playTrack(track, tracks)}
                                    style={({ pressed }) => [
                                        styles.trackItem,
                                        { backgroundColor: colors.backgroundElement },
                                        pressed && { opacity: 0.8 }
                                    ]}
                                >
                                    <View style={styles.trackImageContainer}>
                                        <Image source={{ uri: track.image || coverImage }} style={styles.trackImage} contentFit="cover" />
                                        <View style={styles.trackPlayOverlay}>
                                            <AppIcon ios="play.fill" android="play" size={14} color="#fff" />
                                        </View>
                                    </View>

                                    <View style={styles.trackInfo}>
                                        <RNText style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>{track.title}</RNText>
                                        <View style={styles.trackSubtitleRow}>
                                            {isLiked && <AppIcon ios="heart.fill" android="heart" size={12} color={colors.accent} />}
                                            {!isLiked && <AppIcon ios="checkmark.circle.fill" android="checkmark-circle" size={12} color={colors.accent} />}
                                            <RNText style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                                                {' '}{track.artist} • {formatDuration(track.duration)}
                                            </RNText>
                                        </View>
                                    </View>

                                    <Pressable 
                                        onPress={() => handleTrackOptions(track)}
                                        style={styles.trackMoreButton}
                                    >
                                        <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.text} />
                                    </Pressable>
                                </Pressable>
                            ))
                        )}
                    </View>

                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '600' },
    pressed: { opacity: 0.7 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 100 },
    coverArtContainer: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 24,
    },
    coverArt: {
        width: screenWidth * 0.7,
        height: screenWidth * 0.7,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 24,
    },
    mainTitle: { fontSize: 32, fontWeight: '700' },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    secondaryButtonText: { fontSize: 15, fontWeight: '600' },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    playButtonText: { fontSize: 16, fontWeight: '700' },
    circleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metaContainer: { paddingHorizontal: 24, marginBottom: 24 },
    metaText: { fontSize: 13, textAlign: 'center', marginBottom: 16, fontWeight: '500' },
    aboutTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
    aboutText: { fontSize: 14, lineHeight: 20 },
    toggleAboutButton: { alignSelf: 'flex-start', marginTop: 8 },
    toggleAboutText: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 12,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterChipText: { fontSize: 13, fontWeight: '600' },
    circleButtonSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    trackList: { paddingHorizontal: 16, gap: 8 },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
    },
    trackImageContainer: {
        width: 52,
        height: 52,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
        position: 'relative',
    },
    trackImage: { width: '100%', height: '100%' },
    trackPlayOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trackInfo: { flex: 1, justifyContent: 'center', gap: 4 },
    trackTitle: { fontSize: 15, fontWeight: '600' },
    trackSubtitleRow: { flexDirection: 'row', alignItems: 'center' },
    trackArtist: { fontSize: 13 },
    trackMoreButton: { padding: 8 },
    emptyState: { padding: 40, alignItems: 'center' }
});