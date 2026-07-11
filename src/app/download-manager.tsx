import React from 'react';
import { StyleSheet, View, Text as RNText, FlatList, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '@/components/ui/app-icon';
import { usePlaybackStore, DownloadQueueItem } from '@/store/usePlaybackStore';
import MiniPlayer from '@/components/mini-player';

const { width: screenWidth } = Dimensions.get('window');

export default function DownloadManagerScreen() {
    const insets = useSafeAreaInsets();
    const colors = useTheme();
    const router = useRouter();

    const downloadQueue = usePlaybackStore((state) => state.downloadQueue);
    const cancelDownload = usePlaybackStore((state) => state.cancelDownload);
    const clearFinishedDownloads = usePlaybackStore((state) => state.clearFinishedDownloads);

    const handleClearFinished = () => {
        clearFinishedDownloads();
    };

    const handleCancel = (id: string) => {
        cancelDownload(id);
    };

    const getStatusText = (status: DownloadQueueItem['status']) => {
        switch (status) {
            case 'queued':
                return 'Queued';
            case 'downloading':
                return 'Downloading...';
            case 'stitching':
                return 'Stitching...';
            case 'completed':
                return 'Completed';
            case 'failed':
                return 'Failed';
            default:
                return '';
        }
    };

    const getStatusColor = (status: DownloadQueueItem['status']) => {
        switch (status) {
            case 'queued':
                return colors.textSecondary;
            case 'downloading':
                return '#ff9800'; // Orange
            case 'stitching':
                return '#9c27b0'; // Purple
            case 'completed':
                return '#4caf50'; // Green
            case 'failed':
                return '#f44336'; // Red
            default:
                return colors.text;
        }
    };

    const renderItem = ({ item }: { item: DownloadQueueItem }) => {
        const statusColor = getStatusColor(item.status);
        const canCancel = item.status === 'queued' || item.status === 'failed';
        const showProgress = item.status === 'downloading' || item.status === 'stitching';

        return (
            <View style={[styles.itemContainer, { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder }]}>
                <Image
                    source={{ uri: item.track.image || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=120' }}
                    style={styles.artwork}
                />
                
                <View style={styles.detailsContainer}>
                    <RNText numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                        {item.track.title}
                    </RNText>
                    <RNText numberOfLines={1} style={[styles.artist, { color: colors.textSecondary }]}>
                        {item.track.artist}
                    </RNText>
                    
                    <View style={styles.statusRow}>
                        <RNText style={[styles.statusText, { color: statusColor }]}>
                            {getStatusText(item.status)}
                            {showProgress && ` (${item.progress}%)`}
                        </RNText>
                        <RNText style={[styles.modeBadge, { color: colors.accent, borderColor: colors.accent }]}>
                            {item.downloadMode.toUpperCase()}
                        </RNText>
                    </View>

                    {showProgress && (
                        <View style={[styles.progressBarContainer, { backgroundColor: colors.cardBorder }]}>
                            <View 
                                style={[
                                    styles.progressBarFill, 
                                    { 
                                        width: `${item.progress}%`, 
                                        backgroundColor: item.status === 'stitching' ? '#9c27b0' : colors.accent 
                                    }
                                ]} 
                            />
                        </View>
                    )}

                    {item.status === 'failed' && item.error && (
                        <RNText numberOfLines={1} style={styles.errorText}>
                            {item.error}
                        </RNText>
                    )}
                </View>

                {canCancel && (
                    <Pressable
                        onPress={() => handleCancel(item.id)}
                        style={({ pressed }) => [
                            styles.cancelButton,
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon ios="trash.fill" android="trash" size={18} color="#f44336" />
                    </Pressable>
                )}

                {item.status === 'downloading' && (
                    <ActivityIndicator size="small" color={colors.accent} style={styles.loader} />
                )}
                {item.status === 'stitching' && (
                    <ActivityIndicator size="small" color="#9c27b0" style={styles.loader} />
                )}
            </View>
        );
    };

    const hasFinishedItems = downloadQueue.some(
        (item) => item.status === 'completed' || item.status === 'failed'
    );

    return (
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        styles.backButton,
                        { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                        pressed && styles.pressed
                    ]}
                >
                    <AppIcon ios="chevron.left" android="chevron-back" size={24} color={colors.text} />
                </Pressable>
                
                <RNText style={[styles.headerTitle, { color: colors.text }]}>Downloads</RNText>
                
                <View style={{ flex: 1 }} />

                {hasFinishedItems && (
                    <Pressable
                        onPress={handleClearFinished}
                        style={({ pressed }) => [
                            styles.clearButton,
                            { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                            pressed && styles.pressed
                        ]}
                    >
                        <RNText style={[styles.clearButtonText, { color: colors.accent }]}>Clear Finished</RNText>
                    </Pressable>
                )}
            </View>

            {/* List */}
            <FlatList
                data={downloadQueue}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <AppIcon ios="arrow.down.circle" android="download" size={64} color={colors.textSecondary} />
                        <RNText style={[styles.emptyTitle, { color: colors.text }]}>No Active Downloads</RNText>
                        <RNText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            Songs enqueued for download will appear here.
                        </RNText>
                    </View>
                }
            />

            <MiniPlayer />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 56,
        gap: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    clearButton: {
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
        gap: 12,
        paddingBottom: 100,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        gap: 12,
    },
    artwork: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    detailsContainer: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
    },
    artist: {
        fontSize: 13,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    modeBadge: {
        fontSize: 9,
        fontWeight: '700',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
    },
    progressBarContainer: {
        height: 4,
        borderRadius: 2,
        width: '100%',
        marginTop: 6,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
    },
    errorText: {
        fontSize: 11,
        color: '#f44336',
        marginTop: 4,
    },
    cancelButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loader: {
        paddingHorizontal: 8,
    },
    pressed: {
        opacity: 0.7,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 32,
    },
});
