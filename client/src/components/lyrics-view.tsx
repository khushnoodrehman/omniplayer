import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';

export default function LyricsView() {
    const colors = useTheme();

    // Directly store se sab kuch le lo
    const position = usePlaybackStore((state) => state.position);
    const lyrics = usePlaybackStore((state) => state.currentLyrics);
    const loading = usePlaybackStore((state) => state.isLyricsLoading);
    const error = usePlaybackStore((state) => state.lyricsError);

    const scrollViewRef = useRef<ScrollView>(null);
    const [activeIndex, setActiveIndex] = useState(-1);

    // Sync logic (hamesha chalegi)
    // 🌟 SYNC LYRICS WITH AUDIO POSITION
    useEffect(() => {
        let isMounted = true; // 🌟 Naya check add kiya

        if (lyrics.length === 0 || position === undefined) return;

        let newIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
            if (position >= lyrics[i].time) {
                newIndex = i;
            } else {
                break;
            }
        }

        // 🌟 Check for isMounted before updating state
        if (isMounted && newIndex !== activeIndex && newIndex !== -1) {
            setActiveIndex(newIndex);
            scrollViewRef.current?.scrollTo({ y: Math.max(0, newIndex * 40 - Dimensions.get('window').height * 0.15), animated: true });
        }

        // 🌟 Cleanup function
        return () => {
            isMounted = false;
        };
    }, [position, lyrics, activeIndex]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        );
    }

    if (error || lyrics.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error || "Lyrics not found"}</Text>
            </View>
        );
    }

    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {lyrics.map((lyric, index) => {
                const isActive = index === activeIndex;
                const isStatic = lyrics.length === 1 && lyric.time === 0;

                return (
                    <Text
                        key={index}
                        style={[
                            styles.lyricLine,
                            { color: isActive ? colors.text : colors.textSecondary },
                            isActive && styles.activeLyric,
                            isStatic && styles.staticLyric
                        ]}
                    >
                        {lyric.text || ' '}
                    </Text>
                );
            })}
        </ScrollView>
    );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        maxHeight: height * 0.5,
    },
    scrollContent: {
        paddingVertical: 60, // Padding barhai hai taake start/end lines beech me ayen
        paddingHorizontal: 24,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    lyricLine: {
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginVertical: 10,
        opacity: 0.5,
    },
    activeLyric: {
        fontSize: 26,
        fontWeight: '800',
        opacity: 1,
        transform: [{ scale: 1.05 }],
    },
    staticLyric: {
        fontSize: 16,
        fontWeight: '400',
        opacity: 0.8,
        textAlign: 'left',
        lineHeight: 24,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
    }
});