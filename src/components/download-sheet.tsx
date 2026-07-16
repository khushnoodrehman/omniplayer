import { AppIcon } from '@/components/ui/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { DownloadOptions, Track, usePlaybackStore } from '@/store/usePlaybackStore';
import { BottomSheet, RNHostView } from '@expo/ui';
import { Pressable, Text as RNText, StyleSheet, Switch, View } from 'react-native';

interface DownloadSheetProps {
    isVisible: boolean;
    onClose: () => void;
    track?: Track | null;
    playlistName?: string;
    tracksCount?: number;
    onStartDownload: (options: DownloadOptions) => void;
}

export default function DownloadSheet({
    isVisible,
    onClose,
    track,
    playlistName,
    tracksCount,
    onStartDownload
}: DownloadSheetProps) {
    const colors = useTheme();

    const {
        downloadMode,
        downloadFormat,
        downloadQuality,
        exportSeparateLrcFile,
        setDownloadMode,
        setDownloadFormat,
        setDownloadQuality,
        setExportSeparateLrcFile
    } = usePlaybackStore();

    // Estimate file size based on duration and quality settings
    const calculateEstimatedSize = () => {
        const avgSongDuration = track?.duration || 210; // 3.5 mins default
        const count = tracksCount || 1;
        const totalDurationMins = (avgSongDuration / 60) * count;

        // 128 kbps is ~0.9MB/min, 256 kbps is ~1.8MB/min
        const factor = downloadQuality === '256' ? 1.8 : 0.9;
        return (totalDurationMins * factor).toFixed(1);
    };

    const handleDownload = () => {
        onStartDownload({
            downloadMode,
            downloadFormat,
            downloadQuality,
            exportSeparateLrcFile
        });
        onClose();
    };

    const isPlaylist = !!playlistName;

    return (
        <BottomSheet
            isPresented={isVisible}
            onDismiss={onClose}
            snapPoints={[{ fraction: 0.25 }, 'half', { fraction: 0.9 }]}
            showDragIndicator={true}
        >
            <RNHostView matchContents>
                <View style={[styles.container, { backgroundColor: colors.background }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <RNText style={[styles.title, { color: colors.text }]}>
                            {isPlaylist ? 'Download Playlist' : 'Download Song'}
                        </RNText>
                        <RNText style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {isPlaylist ? `${playlistName} (${tracksCount} songs)` : (track ? `${track.title} • ${track.artist}` : '')}
                        </RNText>
                    </View>

                    {/* 1. Download Mode Selection */}
                    <View style={styles.section}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Download Mode</RNText>
                        <View style={[styles.segmentContainer, { backgroundColor: colors.backgroundElement }]}>
                            <Pressable
                                onPress={() => setDownloadMode('fast')}
                                style={[
                                    styles.segmentButton,
                                    downloadMode === 'fast' && { backgroundColor: colors.accent }
                                ]}
                            >
                                <RNText style={[
                                    styles.segmentText,
                                    { color: downloadMode === 'fast' ? '#fff' : colors.textSecondary }
                                ]}>
                                    Fast (App Only)
                                </RNText>
                            </Pressable>
                            <Pressable
                                onPress={() => setDownloadMode('premium')}
                                style={[
                                    styles.segmentButton,
                                    downloadMode === 'premium' && { backgroundColor: colors.accent }
                                ]}
                            >
                                <RNText style={[
                                    styles.segmentText,
                                    { color: downloadMode === 'premium' ? '#fff' : colors.textSecondary }
                                ]}>
                                    Premium (Export)
                                </RNText>
                            </Pressable>
                        </View>
                    </View>

                    {/* 2. Format Selection */}
                    <View style={styles.section}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Audio Format</RNText>
                        <View style={[styles.segmentContainer, { backgroundColor: colors.backgroundElement }]}>
                            <Pressable
                                onPress={() => setDownloadFormat('m4a')}
                                style={[
                                    styles.segmentButton,
                                    downloadFormat === 'm4a' && { backgroundColor: colors.accent }
                                ]}
                            >
                                <RNText style={[
                                    styles.segmentText,
                                    { color: downloadFormat === 'm4a' ? '#fff' : colors.textSecondary }
                                ]}>
                                    M4A (AAC)
                                </RNText>
                            </Pressable>
                            <Pressable
                                onPress={() => setDownloadFormat('mp3')}
                                style={[
                                    styles.segmentButton,
                                    downloadFormat === 'mp3' && { backgroundColor: colors.accent }
                                ]}
                            >
                                <RNText style={[
                                    styles.segmentText,
                                    { color: downloadFormat === 'mp3' ? '#fff' : colors.textSecondary }
                                ]}>
                                    MP3 (LAME)
                                </RNText>
                            </Pressable>
                        </View>
                    </View>

                    {/* 3. Audio Quality Selection */}
                    <View style={styles.section}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Audio Quality</RNText>
                        <View style={[styles.segmentContainer, { backgroundColor: colors.backgroundElement }]}>
                            <Pressable
                                onPress={() => setDownloadQuality('128')}
                                style={[
                                    styles.segmentButton,
                                    downloadQuality === '128' && { backgroundColor: colors.accent }
                                ]}
                            >
                                <RNText style={[
                                    styles.segmentText,
                                    { color: downloadQuality === '128' ? '#fff' : colors.textSecondary }
                                ]}>
                                    Standard (128 kbps)
                                </RNText>
                            </Pressable>
                            <Pressable
                                onPress={() => setDownloadQuality('256')}
                                style={[
                                    styles.segmentButton,
                                    downloadQuality === '256' && { backgroundColor: colors.accent }
                                ]}
                            >
                                <RNText style={[
                                    styles.segmentText,
                                    { color: downloadQuality === '256' ? '#fff' : colors.textSecondary }
                                ]}>
                                    High (256 kbps)
                                </RNText>
                            </Pressable>
                        </View>
                    </View>

                    {/* 4. Lyrics sidecar file export (Show only for premium exports) */}
                    {downloadMode === 'premium' && (
                        <View style={[styles.toggleRow, { backgroundColor: colors.backgroundElement }]}>
                            <View style={styles.toggleLabelContainer}>
                                <RNText style={[styles.toggleTitle, { color: colors.text }]}>
                                    Export Separate Lyrics (.lrc) File
                                </RNText>
                                <RNText style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                                    Saves a synced .lrc sidecar file alongside the audio file in the public folder.
                                </RNText>
                            </View>
                            <Switch
                                value={exportSeparateLrcFile}
                                onValueChange={setExportSeparateLrcFile}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.accent }}
                                thumbColor={exportSeparateLrcFile ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    )}

                    {/* Estimated file size info */}
                    <View style={styles.footerInfo}>
                        <AppIcon ios="info.circle" android="information-circle-outline" size={16} color={colors.textSecondary} />
                        <RNText style={[styles.infoText, { color: colors.textSecondary }]}>
                            Estimated file size: ~{calculateEstimatedSize()} MB
                        </RNText>
                    </View>

                    {/* Confirm action button */}
                    <Pressable
                        onPress={handleDownload}
                        style={[styles.downloadButton, { backgroundColor: colors.accent }]}
                    >
                        <AppIcon ios="arrow.down.circle.fill" android="download" size={20} color="#fff" />
                        <RNText style={styles.downloadButtonText}>
                            {isPlaylist ? 'Start Playlist Download' : 'Start Download'}
                        </RNText>
                    </Pressable>

                </View>
            </RNHostView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        paddingBottom: 40,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.8,
        textAlign: 'center',
    },
    section: {
        marginTop: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        opacity: 0.9,
    },
    segmentContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentText: {
        fontSize: 13,
        fontWeight: '600',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        marginTop: 20,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    toggleLabelContainer: {
        flex: 1,
        marginRight: 16,
    },
    toggleTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    toggleDesc: {
        fontSize: 11,
        opacity: 0.6,
        marginTop: 2,
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 28,
        marginBottom: 16,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '500',
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 16,
        borderRadius: 99,
    },
    downloadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});