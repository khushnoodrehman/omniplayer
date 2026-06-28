import { create } from 'zustand';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
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
}

let playerInstance: AudioPlayer | null = null;
let statusSubscription: any = null;

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
        set({ isLyricsLoading: true, lyricsError: null, currentLyrics: [] });
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
                        set({ currentLyrics: parseLRC(download.lyrics), isLyricsLoading: false });
                    } else {
                        set({ currentLyrics: [{ time: 0, text: download.lyrics }], isLyricsLoading: false });
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
                set({ currentLyrics: parseLRC(data.lyrics) });
            } else if (data.type === 'static') {
                set({ currentLyrics: [{ time: 0, text: data.lyrics }] });
            } else {
                set({ lyricsError: 'Lyrics not available' });
            }
        } catch (err) {
            set({ lyricsError: 'Failed to load lyrics' });
        } finally {
            set({ isLyricsLoading: false });
        }
    },

    playTrack: async (track: Track, newQueue?: Track[]) => {
        try {
            if (playerInstance) {
                playerInstance.pause();
                if (statusSubscription) {
                    statusSubscription.remove();
                    statusSubscription = null;
                }
                if (typeof playerInstance.release === 'function') {
                    playerInstance.release();
                }
                playerInstance = null;
            }

            const currentQueue = newQueue || get().queue;
            const index = currentQueue.findIndex(t => t.id === track.id);

            set({
                currentTrack: track,
                queue: currentQueue,
                currentIndex: index !== -1 ? index : 0,
                isPlayerVisible: true,
                position: 0,
                duration: track.duration,
                isPlaying: true
            });

            addToHistoryDB(track);
            get().fetchLyricsForTrack(track);

            set((state) => {
                const newHistory = [track, ...state.history.filter(t => t.id !== track.id)].slice(0, 30);
                return { history: newHistory };
            });

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
                            console.log(`[PlaybackStore] Playing local downloaded file: ${streamUrl}`);
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
                    }
                } catch (err) {
                    console.error("Store stream fetch error:", err);
                }
            }

            if (!streamUrl) {
                console.warn("Track URI missing hai! Gaana play nahi ho sakta.");
                return;
            }

            await setAudioModeAsync({
                playsInSilentMode: true,
                shouldPlayInBackground: true,
            });

            playerInstance = createAudioPlayer(streamUrl, {
                updateInterval: 1000 // Flood prevention: update state once per second
            });

            statusSubscription = playerInstance.addListener('playbackStatusUpdate', (status) => {
                const curTime = status.currentTime !== undefined ? status.currentTime : 0;
                const dur = status.duration !== undefined ? status.duration : (track.duration || 0);
                const playingState = status.playbackState === 'playing' || !!status.playing;

                set({
                    position: Math.floor(curTime),
                    duration: Math.floor(dur),
                    isPlaying: playingState,
                });

                if (status.playbackState === 'ended' || status.didJustFinish) {
                    get().playNext();
                }
            });

            playerInstance.play();

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
                set({ isPlaying: false, position: 0 });
                return;
            }
        }

        const nextTrack = queue[nextIndex];
        if (nextTrack) await get().playTrack(nextTrack, queue);
    },

    playPrevious: async () => {
        const { queue, currentIndex, position } = get();
        if (queue.length === 0) return;

        if (position > 3 && playerInstance) {
            await playerInstance.seekTo(0);
            set({ position: 0 });
            return;
        }

        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            prevIndex = queue.length - 1;
        }

        const prevTrack = queue[prevIndex];
        if (prevTrack) await get().playTrack(prevTrack, queue);
    },

    togglePlay: async () => {
        const { isPlaying } = get();
        if (playerInstance) {
            if (isPlaying) {
                playerInstance.pause();
                set({ isPlaying: false });
            } else {
                playerInstance.play();
                set({ isPlaying: true });
            }
        }
    },

    seek: async (positionSeconds: number) => {
        if (playerInstance) {
            await playerInstance.seekTo(positionSeconds);
            set({ position: positionSeconds });
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

    toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
    toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
}));