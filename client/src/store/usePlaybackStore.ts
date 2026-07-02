import { create } from 'zustand';
import TrackPlayer from '@rntp/player';
import { setupPlayer } from '@/services/playbackService';
// 🌟 DATABASE IMPORTS ADD KIYE HAIN
import { addFavoriteDB, removeFavoriteDB, getFavoritesDB, addToHistoryDB, getHistoryDB, getDownloadDB } from '@/services/db';
import * as FileSystem from 'expo-file-system/legacy';

const BACKEND_URL = 'http://192.168.43.179:5000';

export interface Track {
    id: string;
    title: string;
    artist: string;
    image: string;
    duration: number;
    sourceType: 'local' | 'youtube';
    audioFormat?: string;
    fileSize?: string;
    uri?: string;
}

// 🌟 LYRIC INTERFACE
export interface ParsedLyric {
    time: number;
    text: string;
}

interface PlaybackState {
    currentTrack: Track | null;
    queue: Track[];
    currentIndex: number;
    isPlaying: boolean;
    position: number;
    duration: number;
    isPlayerVisible: boolean;
    isShuffle: boolean;
    isRepeat: boolean;
    favoriteTracks: string[];
    history: Track[];

    // 🌟 LYRICS CACHING STATE
    currentLyrics: ParsedLyric[];
    isLyricsLoading: boolean;
    lyricsError: string | null;
    loadedLyricsTrackId: string | null;

    playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
    playNext: () => Promise<void>;
    playPrevious: () => Promise<void>;
    togglePlay: () => Promise<void>;
    seek: (position: number) => Promise<void>;
    setPlayerVisible: (visible: boolean) => void;
    toggleFavorite: (track: Track) => Promise<void>;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    loadStoreData: () => Promise<void>;
    fetchLyricsForTrack: (track: Track) => Promise<void>;
    resolveTrackUri: (track: Track) => Promise<string | undefined>;
}

const pendingResolutions = new Map<string, Promise<string | undefined>>();

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
    currentTrack: null,
    queue: [],
    currentIndex: -1,
    isPlaying: false,
    position: 0,
    duration: 0,
    isPlayerVisible: false,
    isShuffle: false,
    isRepeat: false,
    favoriteTracks: [],
    history: [],

    // 🌟 LYRICS STATE INIT
    currentLyrics: [],
    isLyricsLoading: false,
    lyricsError: null,
    loadedLyricsTrackId: null,

    loadStoreData: async () => {
        try {
            const favs = await getFavoritesDB();
            const hist = await getHistoryDB();
            set({
                favoriteTracks: favs.map(f => f.id),
                history: hist
            });
        } catch (error) {
            console.error("Error loading store data:", error);
        }
    },

    fetchLyricsForTrack: async (track: Track) => {
        if (get().loadedLyricsTrackId === track.id) {
            console.log(`[PlaybackStore] Lyrics already loaded for: ${track.title}`);
            return;
        }
        set({ isLyricsLoading: true, lyricsError: null, currentLyrics: [], loadedLyricsTrackId: null });
        try {
            // Check downloads database for offline cached lyrics
            try {
                const download = await getDownloadDB(track.id);
                if (download && download.lyrics && download.lyricsType && download.lyricsType !== 'none') {
                    console.log(`[PlaybackStore] Using offline cached lyrics for: ${track.title}`);
                    if (download.lyricsType === 'synced') {
                        const parseLRC = (lrcText: string): ParsedLyric[] => {
                            const lines = lrcText.split('\n');
                            const parsed: ParsedLyric[] = [];
                            const timeRegex = /\[(\d{2}):(\d{2}\.\d{2,3})\]/;
                            lines.forEach(line => {
                                const match = line.match(timeRegex);
                                if (match) {
                                    const min = parseInt(match[1], 10);
                                    const sec = parseFloat(match[2]);
                                    parsed.push({ time: (min * 60) + sec, text: line.replace(timeRegex, '').trim() });
                                }
                            });
                            return parsed;
                        };
                        set({ currentLyrics: parseLRC(download.lyrics), isLyricsLoading: false, loadedLyricsTrackId: track.id });
                    } else {
                        set({ currentLyrics: [{ time: 0, text: download.lyrics }], isLyricsLoading: false, loadedLyricsTrackId: track.id });
                    }
                    return;
                }
            } catch (dbErr) {
                console.error("[PlaybackStore] Error checking downloads DB for lyrics:", dbErr);
            }

            let sendTitle = track.title;
            let sendArtist = track.artist;

            if (track.sourceType === 'local') {
                if (track.title.includes(' - ')) {
                    const parts = track.title.split(' - ');
                    sendArtist = parts[0].trim();
                    sendTitle = parts[1].trim();
                    sendTitle = sendTitle.replace(/\.(mp3|flac|m4a|ogg)$/i, '');
                    sendArtist = sendArtist.replace(/^\d+\.?\s*/, '');
                } else {
                    sendTitle = track.title.replace(/\.(mp3|flac|m4a|ogg)$/i, '');
                    sendArtist = '';
                }
            }

            const targetId = track.sourceType === 'youtube' ? track.id : '';

            const url = `${BACKEND_URL}/api/lyrics?title=${encodeURIComponent(sendTitle)}&artist=${encodeURIComponent(sendArtist)}&id=${encodeURIComponent(targetId)}`;

            console.log(`[Zustand] Outgoing Lyrics Request -> Title: "${sendTitle}" | Artist: "${sendArtist}"`);

            const response = await fetch(url);
            const data = await response.json();

            if (data.type === 'synced') {
                const parseLRC = (lrcText: string): ParsedLyric[] => {
                    const lines = lrcText.split('\n');
                    const parsed: ParsedLyric[] = [];
                    const timeRegex = /\[(\d{2}):(\d{2}\.\d{2,3})\]/;
                    lines.forEach(line => {
                        const match = line.match(timeRegex);
                        if (match) {
                            const min = parseInt(match[1], 10);
                            const sec = parseFloat(match[2]);
                            parsed.push({ time: (min * 60) + sec, text: line.replace(timeRegex, '').trim() });
                        }
                    });
                    return parsed;
                };
                set({ currentLyrics: parseLRC(data.lyrics), loadedLyricsTrackId: track.id });
            } else if (data.type === 'static') {
                set({ currentLyrics: [{ time: 0, text: data.lyrics }], loadedLyricsTrackId: track.id });
            } else {
                set({ lyricsError: 'Lyrics not available', loadedLyricsTrackId: track.id });
            }
        } catch (err) {
            set({ lyricsError: 'Failed to load lyrics', loadedLyricsTrackId: null });
        } finally {
            set({ isLyricsLoading: false });
        }
    },

    playTrack: async (track: Track, newQueue?: Track[]) => {
        try {
            await setupPlayer();

            // If same track is already playing/paused, just seek to 0 and resume play
            const store = get();
            if (store.currentTrack?.id === track.id) {
                console.log(`[PlaybackStore] Same track selected. Restarting playback.`);
                await TrackPlayer.seekTo(0);
                await TrackPlayer.play();
                return;
            }

            try {
                await TrackPlayer.pause();
            } catch (err) {}

            const currentQueue = newQueue || get().queue;
            const index = currentQueue.findIndex(t => t.id === track.id);
            const activeIndex = index !== -1 ? index : 0;

            // 1. Update local Zustand state first
            set({
                currentTrack: track,
                queue: currentQueue,
                currentIndex: activeIndex,
                isPlayerVisible: true,
                position: 0,
                duration: track.duration,
                isPlaying: true
            });

            // Save history and fetch lyrics
            addToHistoryDB(track);
            get().fetchLyricsForTrack(track);

            set((state) => {
                const newHistory = [track, ...state.history.filter(t => t.id !== track.id)].slice(0, 30);
                return { history: newHistory };
            });

            // 2. Resolve URL (resolves instantly for local/offline/cached, takes ~1s for new online streams)
            const startTime = Date.now();
            const resolvedCurrentUrl = await get().resolveTrackUri(track);
            console.log(`[PlaybackStore] resolveTrackUri for "${track.title}" took ${Date.now() - startTime}ms`);
            if (!resolvedCurrentUrl) {
                console.warn("Could not resolve current track URL.");
                return;
            }

            // 3. Set queue in player immediately with the resolved URL for the active track.
            const mediaItems = currentQueue.map((t, idx) => {
                const mediaDuration = (t.duration && t.duration > 0) ? t.duration : undefined;
                
                // Active track gets the real resolved URL. Neighbors get placeholders or cached URLs.
                const targetUrl = idx === activeIndex 
                    ? resolvedCurrentUrl 
                    : (t.uri && !t.uri.includes('placeholder') ? t.uri : 'http://placeholder.mp3');
                
                return {
                    mediaId: t.id,
                    url: targetUrl,
                    title: t.title,
                    artist: t.artist,
                    artworkUrl: t.image,
                    duration: mediaDuration,
                };
            });

            await TrackPlayer.setMediaItems(mediaItems, activeIndex);
            await TrackPlayer.play();

        } catch (error) {
            console.error("Audio play error:", error);
        }
    },

    playNext: async () => {
        const { queue, currentIndex, isRepeat } = get();
        if (queue.length === 0) return;

        let nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
            if (isRepeat) {
                nextIndex = 0;
            } else {
                return;
            }
        }

        const nextTrack = queue[nextIndex];
        if (nextTrack) {
            await get().playTrack(nextTrack, queue);
        }
    },

    playPrevious: async () => {
        const { queue, currentIndex } = get();
        if (queue.length === 0) return;

        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = queue.length - 1;
        }

        const prevTrack = queue[prevIndex];
        if (prevTrack) {
            await get().playTrack(prevTrack, queue);
        }
    },

    togglePlay: async () => {
        try {
            if (get().isPlaying) {
                await TrackPlayer.pause();
            } else {
                await TrackPlayer.play();
            }
        } catch (error) {
            console.error("Toggle play error:", error);
        }
    },

    seek: async (positionSeconds: number) => {
        try {
            await TrackPlayer.seekTo(positionSeconds);
            set({ position: positionSeconds });
        } catch (error) {
            console.error("Seek error:", error);
        }
    },

    setPlayerVisible: (visible) => set({ isPlayerVisible: visible }),

    toggleFavorite: async (track: Track) => {
        const { favoriteTracks } = get();
        const isFav = favoriteTracks.includes(track.id);

        if (isFav) {
            await removeFavoriteDB(track.id);
            set({ favoriteTracks: favoriteTracks.filter(id => id !== track.id) });
        } else {
            await addFavoriteDB(track);
            set({ favoriteTracks: [...favoriteTracks, track.id] });
        }
    },

    toggleShuffle: () => {
        const nextShuffle = !get().isShuffle;
        set({ isShuffle: nextShuffle });
        try {
            TrackPlayer.setShuffleEnabled(nextShuffle);
        } catch (err) {
            console.error('TrackPlayer setShuffleEnabled error:', err);
        }
    },

    toggleRepeat: () => {
        const nextRepeat = !get().isRepeat;
        set({ isRepeat: nextRepeat });
        try {
            const { RepeatMode } = require('@rntp/player');
            TrackPlayer.setRepeatMode(nextRepeat ? RepeatMode.All : RepeatMode.Off);
        } catch (err) {
            console.error('TrackPlayer setRepeatMode error:', err);
        }
    },

    resolveTrackUri: async (track: Track) => {
        // Return existing resolution promise if already running
        if (pendingResolutions.has(track.id)) {
            console.log(`[PlaybackStore] Joining existing stream URL resolution promise for ${track.title}`);
            return pendingResolutions.get(track.id);
        }

        const promise = (async () => {
            try {
                if (track.sourceType === 'youtube' && track.uri && !track.uri.includes('placeholder')) {
                    console.log(`[PlaybackStore] Using in-memory cached stream URL for ${track.title}`);
                    return track.uri;
                }

                // Check if track has been downloaded locally
                let streamUrl: string | undefined = track.sourceType === 'youtube' ? undefined : track.uri;

                if (track.sourceType === 'youtube') {
                    try {
                        const download = await getDownloadDB(track.id);
                        if (download && download.localPath) {
                            const fileInfo = await FileSystem.getInfoAsync(download.localPath);
                            if (fileInfo.exists) {
                                streamUrl = download.localPath;
                                track.uri = streamUrl; // Update session memory
                                console.log(`[PlaybackStore] Using local downloaded file: ${streamUrl}`);
                                return streamUrl;
                            } else {
                                console.warn(`[PlaybackStore] Downloaded file not found at: ${download.localPath}, falling back to stream.`);
                            }
                        }
                    } catch (dbErr) {
                        console.error("[PlaybackStore] Error checking downloads DB:", dbErr);
                    }
                }

                if (!streamUrl && track.sourceType === 'youtube') {
                    try {
                        const response = await fetch(`${BACKEND_URL}/api/stream?id=${track.id}`);
                        const data = await response.json();
                        if (data.stream_url) {
                            streamUrl = data.stream_url;
                            track.uri = streamUrl; // Update session memory
                            return streamUrl;
                        }
                    } catch (err) {
                        console.error("Store stream fetch error:", err);
                    }
                }

                return streamUrl || track.uri;
            } catch (err) {
                console.error('[PlaybackStore] resolveTrackUri error:', err);
                return undefined;
            } finally {
                // Clean up lock once promise settles
                pendingResolutions.delete(track.id);
            }
        })();

        pendingResolutions.set(track.id, promise);
        return promise;
    },
}));