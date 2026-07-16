import { AppIcon } from '@/components/ui/app-icon';
import { useTheme } from '@/hooks/use-theme';
import {
    addTrackToPlaylistDB,
    createPlaylistDB,
    getPlaylistsDB,
    removeTrackFromPlaylistDB
} from '@/services/db';
import { Track, usePlaybackStore } from '@/store/usePlaybackStore';
import { BottomSheet, RNHostView } from '@expo/ui';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Pressable, Text as RNText, ScrollView, StyleSheet, TextInput, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface TrackOptionsSheetProps {
    isVisible: boolean;
    onClose: () => void;
    track: Track | null;
    playlistId?: string;
    onTrackRemoved?: () => void;
}

type SheetView = 'actions' | 'playlists' | 'create_playlist';

export default function TrackOptionsSheet({
    isVisible,
    onClose,
    track,
    playlistId,
    onTrackRemoved
}: TrackOptionsSheetProps) {
    const colors = useTheme();
    const [currentView, setCurrentView] = useState<SheetView>('actions');
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const toggleFavorite = usePlaybackStore((state) => state.toggleFavorite);
    const favoriteTracks = usePlaybackStore((state) => state.favoriteTracks);
    const downloadTrack = usePlaybackStore((state) => state.downloadTrack);

    const isFavorited = track ? favoriteTracks.includes(track.id) : false;

    // Reset view state when sheet is opened/closed
    useEffect(() => {
        if (isVisible) {
            setCurrentView('actions');
            setNewPlaylistName('');
            loadPlaylists();
        }
    }, [isVisible]);

    const loadPlaylists = async () => {
        try {
            const list = await getPlaylistsDB();
            // Filter only local custom playlists (starts with pl_)
            setPlaylists(list.filter(p => p.id.startsWith('pl_')));
        } catch (err) {
            console.error('[TrackOptionsSheet] Failed to load playlists:', err);
        }
    };

    if (!track) return null;

    const handleToggleFavorite = async () => {
        await toggleFavorite(track);
        onClose();
    };

    const handleDownload = () => {
        downloadTrack(track);
        onClose();
    };

    const handleRemoveFromPlaylist = () => {
        if (!playlistId) return;
        Alert.alert(
            "Remove Track",
            `Are you sure you want to remove "${track.title}" from this playlist?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        await removeTrackFromPlaylistDB(playlistId, track.id);
                        if (onTrackRemoved) onTrackRemoved();
                        onClose();
                    }
                }
            ]
        );
    };

    const handleAddToPlaylist = async (targetPlaylistId: string, name: string) => {
        await addTrackToPlaylistDB(targetPlaylistId, track);
        Alert.alert("Success", `Added "${track.title}" to "${name}"`);
        onClose();
    };

    const handleCreateAndAdd = async () => {
        const trimmed = newPlaylistName.trim();
        if (!trimmed) {
            Alert.alert("Error", "Playlist name cannot be empty.");
            return;
        }

        const newId = await createPlaylistDB(trimmed);
        if (newId) {
            await addTrackToPlaylistDB(newId, track);
            Alert.alert("Success", `Created playlist "${trimmed}" and added "${track.title}"`);
            onClose();
        } else {
            Alert.alert("Error", "Failed to create playlist.");
        }
    };

    return (
        <BottomSheet
            isPresented={isVisible}
            onDismiss={onClose}
            snapPoints={[{ fraction: 0.25 }, 'half', { fraction: 0.9 }]}
            showDragIndicator={true}
        >
            <RNHostView matchContents>
                <View style={[styles.container, { backgroundColor: colors.background }]}>

                    {/* View 1: Main Actions Menu */}
                    {currentView === 'actions' && (
                        <View style={{ gap: 20 }}>
                            {/* Track Header */}
                            <View style={styles.trackHeader}>
                                <Image
                                    source={{ uri: track.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=120' }}
                                    style={styles.artwork}
                                />
                                <View style={styles.headerText}>
                                    <RNText numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                                        {track.title}
                                    </RNText>
                                    <RNText numberOfLines={1} style={[styles.artist, { color: colors.textSecondary }]}>
                                        {track.artist}
                                    </RNText>
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* Actions List */}
                            <View style={{ gap: 8 }}>
                                <Pressable
                                    onPress={handleToggleFavorite}
                                    style={({ pressed }) => [
                                        styles.actionRow,
                                        { backgroundColor: colors.backgroundElement },
                                        pressed && styles.pressed
                                    ]}
                                >
                                    <AppIcon
                                        ios={isFavorited ? "heart.fill" : "heart"}
                                        android={isFavorited ? "heart" : "heart-outline"}
                                        size={22}
                                        color={isFavorited ? colors.pulseDot : colors.accent}
                                    />
                                    <RNText style={[styles.actionLabel, { color: colors.text }]}>
                                        {isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                                    </RNText>
                                </Pressable>

                                <Pressable
                                    onPress={() => setCurrentView('playlists')}
                                    style={({ pressed }) => [
                                        styles.actionRow,
                                        { backgroundColor: colors.backgroundElement },
                                        pressed && styles.pressed
                                    ]}
                                >
                                    <AppIcon ios="plus.circle" android="add-circle-outline" size={22} color={colors.accent} />
                                    <RNText style={[styles.actionLabel, { color: colors.text }]}>
                                        Add to Playlist
                                    </RNText>
                                </Pressable>

                                <Pressable
                                    onPress={handleDownload}
                                    style={({ pressed }) => [
                                        styles.actionRow,
                                        { backgroundColor: colors.backgroundElement },
                                        pressed && styles.pressed
                                    ]}
                                >
                                    <AppIcon ios="arrow.down.circle" android="download-outline" size={22} color={colors.accent} />
                                    <RNText style={[styles.actionLabel, { color: colors.text }]}>
                                        Download Track
                                    </RNText>
                                </Pressable>

                                {playlistId && (
                                    <Pressable
                                        onPress={handleRemoveFromPlaylist}
                                        style={({ pressed }) => [
                                            styles.actionRow,
                                            { backgroundColor: colors.backgroundElement },
                                            pressed && styles.pressed
                                        ]}
                                    >
                                        <AppIcon ios="trash.fill" android="trash" size={22} color="#f44336" />
                                        <RNText style={[styles.actionLabel, { color: '#f44336' }]}>
                                            Remove from Playlist
                                        </RNText>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    )}

                    {/* View 2: Add to Playlist List */}
                    {currentView === 'playlists' && (
                        <View style={{ gap: 20 }}>
                            <View style={styles.headerWithBack}>
                                <Pressable
                                    onPress={() => setCurrentView('actions')}
                                    style={styles.backButton}
                                >
                                    <AppIcon ios="chevron.left" android="chevron-back" size={24} color={colors.text} />
                                </Pressable>
                                <RNText style={[styles.title, { color: colors.text }]}>Add to Playlist</RNText>
                            </View>

                            <ScrollView
                                style={styles.scrollList}
                                contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                                showsVerticalScrollIndicator={false}
                            >
                                <Pressable
                                    onPress={() => setCurrentView('create_playlist')}
                                    style={({ pressed }) => [
                                        styles.actionRow,
                                        { backgroundColor: colors.backgroundElement, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.accent },
                                        pressed && styles.pressed
                                    ]}
                                >
                                    <AppIcon ios="plus" android="add" size={22} color={colors.accent} />
                                    <RNText style={[styles.actionLabel, { color: colors.accent, fontWeight: '700' }]}>
                                        Create New Playlist
                                    </RNText>
                                </Pressable>

                                {playlists.length === 0 ? (
                                    <View style={styles.emptyView}>
                                        <RNText style={{ color: colors.textSecondary }}>No custom playlists created yet.</RNText>
                                    </View>
                                ) : (
                                    playlists.map((pl) => (
                                        <Pressable
                                            key={pl.id}
                                            onPress={() => handleAddToPlaylist(pl.id, pl.name)}
                                            style={({ pressed }) => [
                                                styles.actionRow,
                                                { backgroundColor: colors.backgroundElement },
                                                pressed && styles.pressed
                                            ]}
                                        >
                                            <AppIcon ios="music.note.list" android="musical-notes-outline" size={20} color={colors.textSecondary} />
                                            <RNText style={[styles.actionLabel, { color: colors.text }]}>
                                                {pl.name}
                                            </RNText>
                                        </Pressable>
                                    ))
                                )}
                            </ScrollView>
                        </View>
                    )}

                    {/* View 3: Create New Playlist Dialog */}
                    {currentView === 'create_playlist' && (
                        <View style={{ gap: 20 }}>
                            <View style={styles.headerWithBack}>
                                <Pressable
                                    onPress={() => setCurrentView('playlists')}
                                    style={styles.backButton}
                                >
                                    <AppIcon ios="chevron.left" android="chevron-back" size={24} color={colors.text} />
                                </Pressable>
                                <RNText style={[styles.title, { color: colors.text }]}>New Playlist</RNText>
                            </View>

                            <View style={{ gap: 16 }}>
                                <TextInput
                                    value={newPlaylistName}
                                    onChangeText={setNewPlaylistName}
                                    placeholder="Enter playlist name..."
                                    placeholderTextColor={colors.textSecondary}
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: colors.backgroundElement,
                                            color: colors.text,
                                            borderColor: colors.cardBorder
                                        }
                                    ]}
                                    autoFocus
                                />

                                <Pressable
                                    onPress={handleCreateAndAdd}
                                    style={({ pressed }) => [
                                        styles.submitButton,
                                        { backgroundColor: colors.accent },
                                        pressed && styles.pressed
                                    ]}
                                >
                                    <RNText style={styles.submitButtonText}>Create & Add</RNText>
                                </Pressable>
                            </View>
                        </View>
                    )}

                </View>
            </RNHostView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    container: {
        width: screenWidth,
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    trackHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    artwork: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    headerText: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    artist: {
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginVertical: 4,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    headerWithBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    backButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollList: {
        maxHeight: 300,
    },
    emptyView: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    input: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 15,
    },
    submitButton: {
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    pressed: {
        opacity: 0.7,
    }
});
