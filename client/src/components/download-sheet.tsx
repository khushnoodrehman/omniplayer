import React, { useState } from 'react';
import { View, Text as RNText, StyleSheet, Pressable, Dimensions } from 'react-native';
import { BottomSheet, RNHostView } from '@expo/ui';
import { useTheme } from '@/hooks/use-theme';
import { Track } from '@/store/usePlaybackStore';
import { AppIcon } from '@/components/ui/app-icon';

const { width } = Dimensions.get('window');

interface DownloadSheetProps {
    isVisible: boolean;
    onClose: () => void;
    track: Track;
    onStartDownload: (format: string, quality: string) => void;
}

export default function DownloadSheet({ isVisible, onClose, track, onStartDownload }: DownloadSheetProps) {
    const colors = useTheme();

    // States for user selection
    const [format, setFormat] = useState<'m4a' | 'mp3' | 'flac'>('m4a');
    const [quality, setQuality] = useState<'128' | '320'>('320');

    // Estimate file size logic (Mock sizes)
    const baseSize = track.duration ? (track.duration / 60) : 3.5; // minutes
    const sizeMultiplier = format === 'flac' ? 5 : (quality === '320' ? 2.4 : 1);
    const estimatedSize = (baseSize * sizeMultiplier).toFixed(1);

    const handleDownload = () => {
        onStartDownload(format, quality);
        onClose();
    };

    return (
        <BottomSheet
            isPresented={isVisible}
            onDismiss={onClose}
            snapPoints={['half']}
            showDragIndicator={true}
        >
            <RNHostView matchContents>
                <View style={[styles.container, { backgroundColor: colors.background }]}>

                    <View style={styles.header}>
                        <RNText style={[styles.title, { color: colors.text }]}>Download Options</RNText>
                        <RNText style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {track.title}
                        </RNText>
                    </View>

                    {/* ── Audio Format Selection ── */}
                    <RNText style={[styles.sectionTitle, { color: colors.text }]}>Audio Format</RNText>
                    <View style={styles.optionsRow}>
                        {['m4a', 'mp3', 'flac'].map((fmt) => {
                            const isActive = format === fmt;
                            return (
                                <Pressable
                                    key={fmt}
                                    onPress={() => setFormat(fmt as any)}
                                    style={[
                                        styles.optionChip,
                                        { backgroundColor: isActive ? colors.accent : colors.backgroundElement },
                                        isActive && { shadowColor: colors.accent, elevation: 4 }
                                    ]}
                                >
                                    <RNText style={[
                                        styles.optionText,
                                        { color: isActive ? '#fff' : colors.textSecondary }
                                    ]}>
                                        {fmt.toUpperCase()}
                                    </RNText>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* ── Audio Quality Selection ── */}
                    <RNText style={[styles.sectionTitle, { color: colors.text }]}>Audio Quality</RNText>
                    <View style={styles.optionsRow}>
                        <Pressable
                            onPress={() => setQuality('128')}
                            style={[
                                styles.optionChip,
                                { flex: 1, backgroundColor: quality === '128' ? colors.accent : colors.backgroundElement }
                            ]}
                        >
                            <RNText style={[styles.optionText, { color: quality === '128' ? '#fff' : colors.textSecondary }]}>
                                Standard (128 kbps)
                            </RNText>
                        </Pressable>
                        <Pressable
                            onPress={() => setQuality('320')}
                            style={[
                                styles.optionChip,
                                { flex: 1, backgroundColor: quality === '320' ? colors.accent : colors.backgroundElement }
                            ]}
                        >
                            <RNText style={[styles.optionText, { color: quality === '320' ? '#fff' : colors.textSecondary }]}>
                                High (320 kbps)
                            </RNText>
                        </Pressable>
                    </View>

                    {/* ── Info & Action Button ── */}
                    <View style={styles.footerInfo}>
                        <AppIcon ios="info.circle" android="information-circle-outline" size={16} color={colors.textSecondary} />
                        <RNText style={[styles.infoText, { color: colors.textSecondary }]}>
                            Estimated file size: ~{estimatedSize} MB
                        </RNText>
                    </View>

                    <Pressable
                        onPress={handleDownload}
                        style={[styles.downloadButton, { backgroundColor: colors.accent }]}
                    >
                        <AppIcon ios="arrow.down.circle.fill" android="download" size={20} color="#fff" />
                        <RNText style={styles.downloadButtonText}>Start Download</RNText>
                    </Pressable>

                </View>
            </RNHostView>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    container: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    header: { marginBottom: 24, alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    subtitle: { fontSize: 14, opacity: 0.8 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginTop: 16 },
    optionsRow: { flexDirection: 'row', gap: 12 },
    optionChip: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionText: { fontSize: 14, fontWeight: '600' },
    footerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32, marginBottom: 16 },
    infoText: { fontSize: 13 },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 16,
        borderRadius: 99,
        marginTop: 8,
    },
    downloadButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});