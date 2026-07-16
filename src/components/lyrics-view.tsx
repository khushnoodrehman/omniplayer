import { useTheme } from '@/hooks/use-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useProgress } from '@rntp/player';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LyricsView() {
    const colors = useTheme();

    const { position } = useProgress(0.1);
    const lyrics = usePlaybackStore((state) => state.currentLyrics);
    const loading = usePlaybackStore((state) => state.isLyricsLoading);
    const error = usePlaybackStore((state) => state.lyricsError);
    const seek = usePlaybackStore((state) => state.seek);

    const scrollViewRef = useRef<ScrollView>(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [scrollViewHeight, setScrollViewHeight] = useState(0);

    // 🌟 FIX: Har line ki exact screen position save karne ke liye
    const itemLayouts = useRef<{ [key: number]: number }>({});

    // User scroll detection taake jab user khud scroll kare toh player usse lare na
    const isUserScrolling = useRef(false);
    const scrollTimeout = useRef<any>(null);

    const handleScrollBegin = () => {
        isUserScrolling.current = true;
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };

    const handleScrollEnd = () => {
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
            isUserScrolling.current = false;
            // Wapas auto-scroll on hone par current line par jao
            if (scrollViewHeight > 0 && activeIndex !== -1 && itemLayouts.current[activeIndex] !== undefined) {
                const centerOffset = scrollViewHeight / 2;
                scrollViewRef.current?.scrollTo({
                    y: Math.max(0, itemLayouts.current[activeIndex] - centerOffset + 20),
                    animated: true
                });
            }
        }, 2000);
    };

    // 🌟 SYNC LYRICS WITH AUDIO POSITION
    useEffect(() => {
        let isMounted = true;

        if (lyrics.length === 0 || position === undefined) return;

        let newIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
            if (position >= lyrics[i].time) {
                newIndex = i;
            } else {
                break;
            }
        }

        if (isMounted && newIndex !== activeIndex && newIndex !== -1) {
            setActiveIndex(newIndex);

            // 🌟 FIX: Tukkay wala math khatam. Asli dynamic Y-Position se scroll karo!
            if (!isUserScrolling.current && itemLayouts.current[newIndex] !== undefined) {
                const centerOffset = scrollViewHeight > 0 ? (scrollViewHeight / 2) : 200;
                // +20 isliye taake line bilkul center mein fixed feel ho
                scrollViewRef.current?.scrollTo({
                    y: Math.max(0, itemLayouts.current[newIndex] - centerOffset + 20),
                    animated: true
                });
            }
        }

        return () => {
            isMounted = false;
        };
    }, [position, lyrics, activeIndex, scrollViewHeight]);

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
            onLayout={(e) => setScrollViewHeight(e.nativeEvent.layout.height)}
            onScrollBeginDrag={handleScrollBegin}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollBegin={handleScrollBegin}
            onMomentumScrollEnd={handleScrollEnd}
        >
            {lyrics.map((lyric, index) => {
                const isActive = index === activeIndex;
                const isStatic = lyrics.length === 1 && lyric.time === 0;

                return (
                    <View
                        key={index}
                        onLayout={(e) => {
                            // 🌟 FIX: Har component render hote hi apni Y-Position yahan save karta hai
                            itemLayouts.current[index] = e.nativeEvent.layout.y;
                        }}
                    >
                        <Pressable
                            onPress={() => {
                                if (!isStatic && lyric.time !== undefined) {
                                    seek(lyric.time);
                                }
                            }}
                            style={({ pressed }) => [
                                pressed && { opacity: 0.7 }
                            ]}
                        >
                            <Text
                                style={[
                                    styles.lyricLine,
                                    { color: isActive ? colors.text : colors.textSecondary },
                                    isActive && styles.activeLyric,
                                    isStatic && styles.staticLyric
                                ]}
                            >
                                {lyric.text || ' '}
                            </Text>
                        </Pressable>
                    </View>
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
        paddingVertical: 60,
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
        marginVertical: 6,
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
        textAlign: 'center',
        lineHeight: 24,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
    }
});