import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text as RNText, Pressable, ScrollView, Dimensions, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore, Track } from '@/store/usePlaybackStore';
import { getPlaylistTracksDB, getPlaylistsDB, deletePlaylistDB, renamePlaylistDB } from '@/services/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InnerTubeClient } from '@/services/InnerTubeClient';
import TrackOptionsSheet from '@/components/track-options-sheet';

const { width: screenWidth } = Dimensions.get('window');

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
    const downloadPlaylist = usePlaybackStore((state) => state.downloadPlaylist);

    const [playlist, setPlaylist] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [reloadTrigger, setReloadTrigger] = useState(0);

    const [isTrackOptionsVisible, setIsTrackOptionsVisible] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
    const [renamePlaylistName, setRenamePlaylistName] = useState('');

    useEffect(() => {
        if (!id) return;
        const fetchPlaylistDetails = async () => {
            setIsLoading(true);
            try {
                // If custom local playlist, load directly from DB and skip API query
                if (id.startsWith('pl_')) {
                    const localTracks = await getPlaylistTracksDB(id);
                    const allLocalPlaylists = await getPlaylistsDB();
                    const matchedPlaylist = allLocalPlaylists.find(p => p.id === id);
                    
                    if (matchedPlaylist) {
                        setPlaylist({
                            id: matchedPlaylist.id,
                            title: matchedPlaylist.name,
                            image: matchedPlaylist.image,
                            songs: localTracks || [],
                            trackCount: localTracks?.length || 0,
                            duration: ""
                        });
                    } else {
                        throw new Error("Custom playlist not found in database.");
                    }
                } else {
                    const data = await InnerTubeClient.getPlaylistDetails(id);
                    setPlaylist(data);
                }
            } catch (error) {
                console.log("[PlaylistScreen] Network error, attempting offline DB fallback for playlist ID:", id);
                try {
                    const localTracks = await getPlaylistTracksDB(id);
                    const allLocalPlaylists = await getPlaylistsDB();
                    const matchedPlaylist = allLocalPlaylists.find(p => p.id === id);
                    
                    if (matchedPlaylist && localTracks && localTracks.length > 0) {
                        setPlaylist({
                            id: matchedPlaylist.id,
                            title: matchedPlaylist.name,
                            image: matchedPlaylist.image,
                            songs: localTracks,
                            trackCount: localTracks.length,
                            duration: ""
                        });
                    } else {
                        throw new Error("No offline copy found in local DB.");
                    }
                } catch (dbErr) {
                    console.error("Offline fallback failed:", dbErr);
                    Alert.alert("Offline", "Could not load playlist details. Make sure you are connected to the internet or have downloaded this playlist.");
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchPlaylistDetails();
    }, [id, reloadTrigger]);

    const handleDownloadPlaylist = () => {
        if (playlist && playlist.songs && playlist.songs.length > 0) {
            downloadPlaylist(playlist.id, playlist.title, playlist.image, playlist.songs);
        } else {
            Alert.alert("Error", "No tracks available to download.");
        }
    };

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
        setSelectedTrack(track);
        setIsTrackOptionsVisible(true);
    };

    const handlePlaylistOptions = () => {
        Alert.alert(
            "Playlist Options",
            `Manage playlist "${playlist.title}"`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Rename",
                    onPress: () => {
                        setRenamePlaylistName(playlist.title);
                        setIsRenameModalVisible(true);
                    }
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => handleDeletePlaylist()
                }
            ]
        );
    };

    const handleDeletePlaylist = () => {
        Alert.alert(
            "Delete Playlist",
            `Are you sure you want to delete "${playlist.title}"? This cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deletePlaylistDB(playlist.id);
                        router.back();
                    }
                }
            ]
        );
    };

    const handleRenamePlaylist = async () => {
        const trimmed = renamePlaylistName.trim();
        if (!trimmed) {
            Alert.alert("Error", "Playlist name cannot be empty.");
            return;
        }
        await renamePlaylistDB(playlist.id, trimmed);
        setIsRenameModalVisible(false);
        setReloadTrigger(prev => prev + 1);
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
                {id?.startsWith('pl_') ? (
                    <Pressable onPress={handlePlaylistOptions} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                        <AppIcon ios="ellipsis" android="ellipsis-vertical" size={24} color={colors.text} />
                    </Pressable>
                ) : (
                    <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                        <AppIcon ios="magnifyingglass" android="search" size={24} color={colors.text} />
                    </Pressable>
                )}
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
                        onPress={handleDownloadPlaylist}
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

            {/* Track Options Bottom Sheet */}
            <TrackOptionsSheet
                isVisible={isTrackOptionsVisible}
                onClose={() => setIsTrackOptionsVisible(false)}
                track={selectedTrack}
                playlistId={id}
                onTrackRemoved={() => setReloadTrigger(prev => prev + 1)}
            />

            {/* Rename Playlist Modal */}
            <Modal
                visible={isRenameModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsRenameModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalContent, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
                        <RNText style={[styles.modalTitle, { color: colors.text }]}>Rename Playlist</RNText>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.cardBorder }]}
                            value={renamePlaylistName}
                            onChangeText={setRenamePlaylistName}
                            placeholder="Enter new name..."
                            placeholderTextColor={colors.textSecondary}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <Pressable
                                onPress={() => setIsRenameModalVisible(false)}
                                style={[styles.modalButton, { borderColor: colors.cardBorder, borderWidth: 1 }]}
                            >
                                <RNText style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</RNText>
                            </Pressable>
                            <Pressable
                                onPress={handleRenamePlaylist}
                                style={[styles.modalButton, { backgroundColor: colors.accent }]}
                            >
                                <RNText style={{ color: '#fff', fontWeight: '700' }}>Save</RNText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
    trackMoreButton: { padding: 4 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: screenWidth - 64, padding: 24, borderRadius: 16, borderWidth: 1, gap: 16 },
    modalTitle: { fontSize: 18, fontWeight: '700' },
    modalInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
    modalButtons: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 4 },
    modalButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
