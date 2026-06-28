import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text as RNText, Pressable, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore, Track } from '@/store/usePlaybackStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MiniPlayer from '@/components/mini-player';

const { width: screenWidth } = Dimensions.get('window');
const BACKEND_URL = 'http://192.168.43.179:5000';

const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function PlaylistScreen() {
    const insets = useSafeAreaInsets();
    const colors = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const playTrack = usePlaybackStore((state) => state.playTrack);

    const [playlist, setPlaylist] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchPlaylistDetails = async () => {
            setIsLoading(true);
            try {
                const cookies = await AsyncStorage.getItem('yt_cookies');
                const headers: HeadersInit = {};
                if (cookies) {
                    headers['Authorization'] = `Bearer ${cookies}`;
                }
                const response = await fetch(`${BACKEND_URL}/api/playlist/${id}`, { headers });
                if (!response.ok) {
                    throw new Error("Failed to fetch playlist details");
                }
                const data = await response.json();
                setPlaylist(data);
            } catch (error) {
                console.error("Error fetching playlist:", error);
                Alert.alert("Error", "Could not load playlist details.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlaylistDetails();
    }, [id]);

    const handlePlayAll = () => {
        if (playlist && playlist.songs && playlist.songs.length > 0) {
            playTrack(playlist.songs[0], playlist.songs);
        }
    };

    const handleShufflePlay = () => {
        if (playlist && playlist.songs && playlist.songs.length > 0) {
            const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
            playTrack(shuffled[0], shuffled);
        }
    };

    const handleTrackOptions = (track: Track) => {
        Alert.alert("Track Options", `Options for "${track.title}"`);
    };

    if (isLoading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    if (!playlist) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                <RNText style={{ color: colors.textSecondary }}>Playlist not found</RNText>
            </View>
        );
    }

    const totalDurationStr = playlist.duration || "";
    const metaText = `${playlist.trackCount || playlist.songs.length} songs${totalDurationStr ? ' • ' + totalDurationStr : ''}`;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <AppIcon ios="arrow.left" android="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <RNText style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>Playlist</RNText>
                <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                    <AppIcon ios="magnifyingglass" android="search" size={24} color={colors.text} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Large Cover Art */}
                <View style={styles.coverArtContainer}>
                    <Image source={{ uri: playlist.image }} style={styles.coverArt} contentFit="cover" />
                </View>

                {/* Title */}
                <View style={styles.titleRow}>
                    <RNText style={[styles.mainTitle, { color: colors.text }]} numberOfLines={2}>{playlist.title}</RNText>
                </View>

                {/* Subtitle / Details */}
                <View style={styles.metaContainer}>
                    <RNText style={[styles.metaText, { color: colors.textSecondary }]}>
                        {metaText}
                    </RNText>
                </View>

                {/* Action Buttons Row */}
                <View style={styles.actionRow}>
                    <Pressable 
                        onPress={() => setIsSaved(!isSaved)}
                        style={({ pressed }) => [
                            styles.actionBtnCircle, 
                            { backgroundColor: colors.backgroundElement }, 
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon 
                            ios={isSaved ? "heart.fill" : "heart"} 
                            android={isSaved ? "heart" : "heart-outline"} 
                            size={20} 
                            color={isSaved ? colors.accent : colors.text} 
                        />
                    </Pressable>

                    <Pressable 
                        onPress={handlePlayAll} 
                        style={({ pressed }) => [
                            styles.playBtn, 
                            { backgroundColor: colors.accent }, 
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon ios="play.fill" android="play" size={18} color="#fff" />
                        <RNText style={styles.playBtnText}>Play</RNText>
                    </Pressable>

                    <Pressable 
                        style={({ pressed }) => [
                            styles.actionBtnCircle, 
                            { backgroundColor: colors.backgroundElement }, 
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon ios="square.and.arrow.up" android="share-social-outline" size={20} color={colors.text} />
                    </Pressable>

                    <Pressable 
                        style={({ pressed }) => [
                            styles.actionBtnCircle, 
                            { backgroundColor: colors.backgroundElement }, 
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon ios="arrow.down.circle" android="download-outline" size={20} color={colors.text} />
                    </Pressable>

                    <Pressable 
                        onPress={handleShufflePlay}
                        style={({ pressed }) => [
                            styles.actionBtnCircle, 
                            { backgroundColor: colors.backgroundElement }, 
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon ios="shuffle" android="shuffle" size={20} color={colors.text} />
                    </Pressable>

                    <Pressable 
                        style={({ pressed }) => [
                            styles.actionBtnCircle, 
                            { backgroundColor: colors.backgroundElement }, 
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.text} />
                    </Pressable>
                </View>

                {/* Track List */}
                <View style={styles.trackList}>
                    {playlist.songs && playlist.songs.map((track: any, index: number) => (
                        <Pressable
                            key={`${track.id}-${index}`}
                            onPress={() => playTrack(track, playlist.songs)}
                            style={({ pressed }) => [
                                styles.trackItem,
                                { backgroundColor: colors.backgroundElement },
                                pressed && { opacity: 0.8 }
                            ]}
                        >
                            <RNText style={[styles.trackIndex, { color: colors.textSecondary }]}>{index + 1}</RNText>
                            <View style={styles.trackImageContainer}>
                                <Image source={{ uri: track.image }} style={styles.trackImage} contentFit="cover" />
                                <View style={styles.trackPlayOverlay}>
                                    <AppIcon ios="play.fill" android="play" size={12} color="#fff" />
                                </View>
                            </View>

                            <View style={styles.trackInfo}>
                                <View style={styles.trackTitleRow}>
                                    <RNText style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>{track.title}</RNText>
                                    {track.isExplicit && (
                                        <View style={[styles.explicitBadge, { backgroundColor: colors.backgroundSelected }]}>
                                            <RNText style={[styles.explicitText, { color: colors.textSecondary }]}>E</RNText>
                                        </View>
                                    )}
                                </View>
                                <RNText style={[styles.trackArtist, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {track.artist}
                                </RNText>
                            </View>

                            <RNText style={[styles.trackDuration, { color: colors.textSecondary }]}>
                                {formatDuration(track.duration)}
                            </RNText>

                            <Pressable 
                                onPress={() => handleTrackOptions(track)}
                                style={styles.trackMoreButton}
                            >
                                <AppIcon ios="ellipsis" android="ellipsis-vertical" size={20} color={colors.textSecondary} />
                            </Pressable>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
            <MiniPlayer />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    iconButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center', marginHorizontal: 8 },
    pressed: { opacity: 0.7 },
    scrollContent: { paddingBottom: 120 },
    coverArtContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    coverArt: {
        width: screenWidth * 0.55,
        height: screenWidth * 0.55,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
    },
    titleRow: {
        paddingHorizontal: 24,
        alignItems: 'center',
        marginBottom: 8,
    },
    mainTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
    metaContainer: { paddingHorizontal: 24, alignItems: 'center', marginBottom: 20 },
    metaText: { fontSize: 13, fontWeight: '500' },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    actionBtnCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    playBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    trackList: { paddingHorizontal: 16, gap: 6 },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
    },
    trackIndex: { width: 24, fontSize: 13, fontWeight: '600', textAlign: 'center', marginRight: 6 },
    trackImageContainer: {
        width: 44,
        height: 44,
        borderRadius: 6,
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
    trackInfo: { flex: 1, justifyContent: 'center', gap: 2 },
    trackTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    trackTitle: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
    explicitBadge: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
    },
    explicitText: {
        fontSize: 8,
        fontWeight: '800',
    },
    trackArtist: { fontSize: 12 },
    trackDuration: { fontSize: 12, marginRight: 8 },
    trackMoreButton: { padding: 4 }
});
