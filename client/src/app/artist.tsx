import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text as RNText, Pressable, ScrollView, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

export default function ArtistScreen() {
    const insets = useSafeAreaInsets();
    const colors = useTheme();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const playTrack = usePlaybackStore((state) => state.playTrack);

    const [artist, setArtist] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchArtistDetails = async () => {
            setIsLoading(true);
            try {
                const cookies = await AsyncStorage.getItem('yt_cookies');
                const headers: HeadersInit = {};
                if (cookies) {
                    headers['Authorization'] = `Bearer ${cookies}`;
                }
                const response = await fetch(`${BACKEND_URL}/api/artist/${id}`, { headers });
                if (!response.ok) {
                    throw new Error("Failed to fetch artist details");
                }
                const data = await response.json();
                setArtist(data);
            } catch (error) {
                console.error("Error fetching artist details:", error);
                Alert.alert("Error", "Could not load artist details.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchArtistDetails();
    }, [id]);

    const handlePlaySong = (song: any, queue: any[]) => {
        playTrack(song, queue);
    };

    const handleShufflePlay = () => {
        if (artist && artist.topSongs && artist.topSongs.length > 0) {
            const shuffled = [...artist.topSongs].sort(() => Math.random() - 0.5);
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

    if (!artist) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                <RNText style={{ color: colors.textSecondary }}>Artist not found</RNText>
            </View>
        );
    }

    const subscriberText = artist.subscribers ? `${artist.subscribers} Subscribers` : "";
    const listenersText = artist.monthlyListeners ? `${artist.monthlyListeners} Monthly` : "";
    const statsText = [subscriberText, listenersText].filter(Boolean).join(" • ");

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Back Button Floating on top of banner */}
            <View style={[styles.floatingHeader, { paddingTop: Math.max(insets.top, 16) }]}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButtonFloating, pressed && styles.pressed]}>
                    <AppIcon ios="arrow.left" android="arrow-back" size={24} color="#fff" />
                </Pressable>
                <View style={{ flex: 1 }} />
                <Pressable style={({ pressed }) => [styles.iconButtonFloating, pressed && styles.pressed]}>
                    <AppIcon ios="magnifyingglass" android="search" size={24} color="#fff" />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Banner / Cover Image */}
                <View style={styles.bannerContainer}>
                    <Image source={{ uri: artist.image }} style={styles.bannerImage} contentFit="cover" />
                    <LinearGradient 
                        colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', colors.background]} 
                        style={StyleSheet.absoluteFill} 
                    />
                    
                    <View style={styles.bannerContent}>
                        <RNText style={styles.artistName} numberOfLines={2}>{artist.name}</RNText>
                        {statsText ? <RNText style={styles.artistStats}>{statsText}</RNText> : null}
                    </View>
                </View>

                {/* Main Action Buttons */}
                <View style={styles.actionRow}>
                    <Pressable 
                        onPress={() => setIsSubscribed(!isSubscribed)}
                        style={({ pressed }) => [
                            styles.actionBtn, 
                            { backgroundColor: isSubscribed ? colors.backgroundSelected : colors.backgroundElement, borderColor: colors.cardBorder },
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon 
                            ios={isSubscribed ? "checkmark" : "plus"} 
                            android={isSubscribed ? "checkmark" : "add"} 
                            size={16} 
                            color={isSubscribed ? colors.accent : colors.text} 
                        />
                        <RNText style={[styles.actionBtnText, { color: isSubscribed ? colors.accent : colors.text }]}>
                            {isSubscribed ? "Subscribed" : "Subscribe"}
                        </RNText>
                    </Pressable>

                    <Pressable 
                        style={({ pressed }) => [
                            styles.actionBtn, 
                            { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon ios="radio" android="radio-outline" size={16} color={colors.text} />
                        <RNText style={[styles.actionBtnText, { color: colors.text }]}>Radio</RNText>
                    </Pressable>

                    <Pressable 
                        onPress={handleShufflePlay}
                        style={({ pressed }) => [
                            styles.actionBtn, 
                            { backgroundColor: colors.backgroundElement, borderColor: colors.cardBorder },
                            pressed && styles.pressed
                        ]}
                    >
                        <AppIcon ios="shuffle" android="shuffle" size={16} color={colors.text} />
                        <RNText style={[styles.actionBtnText, { color: colors.text }]}>Shuffle</RNText>
                    </Pressable>
                </View>

                {/* Section: Top Songs */}
                {artist.topSongs && artist.topSongs.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Top songs</RNText>
                        <View style={styles.songsList}>
                            {artist.topSongs.map((track: any, index: number) => (
                                <Pressable 
                                    key={`${track.id}-${index}`}
                                    onPress={() => handlePlaySong(track, artist.topSongs)}
                                    style={({ pressed }) => [
                                        styles.songRow, 
                                        { backgroundColor: colors.backgroundElement },
                                        pressed && { opacity: 0.8 }
                                    ]}
                                >
                                    <RNText style={[styles.songIndex, { color: colors.textSecondary }]}>{index + 1}</RNText>
                                    <View style={styles.songImageWrapper}>
                                        <Image source={{ uri: track.image }} style={styles.songImage} contentFit="cover" />
                                    </View>
                                    <View style={styles.songInfo}>
                                        <View style={styles.songTitleRow}>
                                            <RNText style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>{track.title}</RNText>
                                            {track.isExplicit && (
                                                <View style={[styles.explicitBadge, { backgroundColor: colors.backgroundSelected }]}>
                                                    <RNText style={[styles.explicitText, { color: colors.textSecondary }]}>E</RNText>
                                                </View>
                                            )}
                                        </View>
                                        <RNText style={[styles.songSub, { color: colors.textSecondary }]} numberOfLines={1}>
                                            {track.artist}
                                        </RNText>
                                    </View>
                                    <RNText style={[styles.songDuration, { color: colors.textSecondary }]}>
                                        {formatDuration(track.duration)}
                                    </RNText>
                                    <Pressable onPress={() => handleTrackOptions(track)} style={styles.moreButton}>
                                        <AppIcon ios="ellipsis" android="ellipsis-vertical" size={18} color={colors.textSecondary} />
                                    </Pressable>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}

                {/* Section: Albums / Singles & EPs */}
                {((artist.albums && artist.albums.length > 0) || (artist.singles && artist.singles.length > 0)) && (
                    <View style={styles.sectionContainer}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Singles & EPs</RNText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
                            {[...(artist.albums || []), ...(artist.singles || [])].map((item: any, index: number) => (
                                <Pressable 
                                    key={`${item.id}-${index}`}
                                    onPress={() => router.push(`/playlist?id=${item.id}`)}
                                    style={[styles.albumCard, { gap: 8 }]}
                                >
                                    <View style={[styles.albumImageWrapper, { backgroundColor: colors.backgroundElement }]}>
                                        <Image source={{ uri: item.image }} style={styles.albumImage} contentFit="cover" />
                                    </View>
                                    <View style={{ gap: 2 }}>
                                        <RNText style={[styles.albumTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</RNText>
                                        <RNText style={[styles.albumSub, { color: colors.textSecondary }]}>{item.year || "EP"}</RNText>
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Section: Videos */}
                {artist.videos && artist.videos.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Videos</RNText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
                            {artist.videos.map((item: any, index: number) => (
                                <Pressable 
                                    key={`${item.id}-${index}`}
                                    onPress={() => handlePlaySong(item, artist.videos)}
                                    style={[styles.videoCard, { gap: 8 }]}
                                >
                                    <View style={[styles.videoImageWrapper, { backgroundColor: colors.backgroundElement }]}>
                                        <Image source={{ uri: item.image }} style={styles.videoImage} contentFit="cover" />
                                        <View style={styles.videoPlayOverlay}>
                                            <AppIcon ios="play.fill" android="play" size={20} color="#fff" />
                                        </View>
                                    </View>
                                    <View style={{ gap: 2 }}>
                                        <RNText style={[styles.videoTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</RNText>
                                        {item.views ? <RNText style={[styles.videoSub, { color: colors.textSecondary }]}>{item.views}</RNText> : null}
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Section: Playlists */}
                {artist.playlists && artist.playlists.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Playlists by {artist.name}</RNText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
                            {artist.playlists.map((item: any, index: number) => (
                                <Pressable 
                                    key={`${item.id}-${index}`}
                                    onPress={() => router.push(`/playlist?id=${item.id}`)}
                                    style={[styles.albumCard, { gap: 8 }]}
                                >
                                    <View style={[styles.albumImageWrapper, { backgroundColor: colors.backgroundElement }]}>
                                        <Image source={{ uri: item.image }} style={styles.albumImage} contentFit="cover" />
                                    </View>
                                    <RNText style={[styles.albumTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</RNText>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Section: Related Artists */}
                {artist.related && artist.related.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <RNText style={[styles.sectionTitle, { color: colors.text }]}>Fans might also like</RNText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
                            {artist.related.map((item: any, index: number) => (
                                <Pressable 
                                    key={`${item.id}-${index}`}
                                    onPress={() => router.push(`/artist?id=${item.id}`)}
                                    style={[styles.relatedCard, { gap: 8 }]}
                                >
                                    <View style={[styles.relatedAvatarWrapper, { backgroundColor: colors.backgroundElement }]}>
                                        <Image source={{ uri: item.image }} style={styles.relatedAvatar} contentFit="cover" />
                                    </View>
                                    <RNText style={[styles.relatedName, { color: colors.text }]} numberOfLines={1}>{item.name}</RNText>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </ScrollView>
            <MiniPlayer />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        zIndex: 10,
        paddingHorizontal: 16,
        height: 60,
        alignItems: 'center',
    },
    iconButtonFloating: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pressed: { opacity: 0.7 },
    scrollContent: { paddingBottom: 120 },
    bannerContainer: {
        height: 280,
        width: '100%',
        position: 'relative',
        justifyContent: 'flex-end',
    },
    bannerImage: {
        ...StyleSheet.absoluteFill,
    },
    bannerContent: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        zIndex: 5,
        gap: 6,
    },
    artistName: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 1, height: 2 },
        textShadowRadius: 6,
    },
    artistStats: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)',
    },
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 12,
        alignItems: 'center',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    sectionContainer: {
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        paddingHorizontal: 24,
        marginBottom: 14,
    },
    songsList: {
        paddingHorizontal: 16,
        gap: 6,
    },
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
    },
    songIndex: {
        width: 24,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginRight: 6,
    },
    songImageWrapper: {
        width: 44,
        height: 44,
        borderRadius: 6,
        overflow: 'hidden',
        marginRight: 12,
    },
    songImage: {
        width: '100%',
        height: '100%',
    },
    songInfo: {
        flex: 1,
        justifyContent: 'center',
        gap: 2,
    },
    songTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    songTitle: {
        fontSize: 14,
        fontWeight: '600',
        flexShrink: 1,
    },
    explicitBadge: {
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
    },
    explicitText: {
        fontSize: 8,
        fontWeight: '800',
    },
    songSub: {
        fontSize: 12,
    },
    songDuration: {
        fontSize: 12,
        marginRight: 8,
    },
    moreButton: {
        padding: 4,
    },
    horizontalScrollContent: {
        paddingHorizontal: 24,
        gap: 16,
    },
    albumCard: {
        width: 130,
    },
    albumImageWrapper: {
        width: 130,
        height: 130,
        borderRadius: 10,
        overflow: 'hidden',
    },
    albumImage: {
        width: '100%',
        height: '100%',
    },
    albumTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    albumSub: {
        fontSize: 11,
    },
    videoCard: {
        width: 180,
    },
    videoImageWrapper: {
        width: 180,
        height: 105,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    videoImage: {
        width: '100%',
        height: '100%',
    },
    videoPlayOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    videoSub: {
        fontSize: 11,
    },
    relatedCard: {
        width: 100,
        alignItems: 'center',
    },
    relatedAvatarWrapper: {
        width: 90,
        height: 90,
        borderRadius: 45,
        overflow: 'hidden',
    },
    relatedAvatar: {
        width: '100%',
        height: '100%',
    },
    relatedName: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'center',
    }
});
