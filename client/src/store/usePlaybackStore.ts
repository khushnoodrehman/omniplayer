import { create } from 'zustand';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
// 🌟 DATABASE IMPORTS ADD KIYE HAIN
import { addFavoriteDB, removeFavoriteDB, getFavoritesDB, addToHistoryDB, getHistoryDB } from '@/services/db';

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
    favoriteTracks: string[]; // Sirf IDs store karenge for quick checking
    history: Track[];         // UI mein history dikhane ke liye

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
    fetchLyricsForTrack: (track: Track) => Promise<void>; // 🌟 FETCH LYRICS FUNCTION
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

    // 🌟 APP START HOTEY HI YE FUNCTION CHALEGA
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

    // 🌟 FETCH LYRICS FUNCTION
    fetchLyricsForTrack: async (track: Track) => {
        set({ isLyricsLoading: true, lyricsError: null, currentLyrics: [] });
        try {
            let sendTitle = track.title;
            let sendArtist = track.artist;

            // 🌟 LOCAL SONGS KE LIYE AUTOMATIC CLEANING LOGIC
            if (track.sourceType === 'local') {
                if (track.title.includes(' - ')) {
                    const parts = track.title.split(' - ');
                    // Agar "Artist - Title" format hai
                    sendArtist = parts[0].strip ? parts[0].strip() : parts[0].trim();
                    sendTitle = parts[1].strip ? parts[1].strip() : parts[1].trim();

                    // File extension (.mp3, .flac, .m4a) remove karo
                    sendTitle = sendTitle.replace(/\.(mp3|flac|m4a|ogg)$/i, '');
                    // Shuru ke numbers (like 03.) remove karo artist se
                    sendArtist = sendArtist.replace(/^\d+\.?\s*/, '');
                } else {
                    sendTitle = track.title.replace(/\.(mp3|flac|m4a|ogg)$/i, '');
                    sendArtist = ''; // Fallback agar artist ka pata na chale
                }
            }

            // Target ID sirf online ke liye bhejenge, local ke liye khali string
            const targetId = track.sourceType === 'youtube' ? track.id : '';

            const url = `${BACKEND_URL}/api/lyrics?title=${encodeURIComponent(sendTitle)}&artist=${encodeURIComponent(sendArtist)}&id=${encodeURIComponent(targetId)}`;

            // 🌟 CLIENT TERMINAL LOG FOR DEBUGGING
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

            // 🌟 GAANA PLAY HOTEY HI HISTORY MEIN SAVE KARO AUR LYRICS MANGWAO
            addToHistoryDB(track);
            get().fetchLyricsForTrack(track); // 🌟 FETCH LYRICS CALL

            set((state) => {
                const newHistory = [track, ...state.history.filter(t => t.id !== track.id)].slice(0, 30);
                return { history: newHistory };
            });

            // DYNAMIC URL FETCHING
            let streamUrl = track.uri;

            if (!streamUrl && track.sourceType === 'youtube') {
                try {
                    const response = await fetch(`${BACKEND_URL}/api/stream?id=${track.id}`);
                    const data = await response.json();
                    if (data.stream_url) {
                        streamUrl = data.stream_url;
                        track.uri = streamUrl;
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

            playerInstance = createAudioPlayer(streamUrl);

            statusSubscription = playerInstance.addListener('playbackStatusUpdate', (status) => {
                if (status.isLoaded) {
                    set({
                        position: Math.floor(status.currentTime || 0),
                        duration: Math.floor(status.duration || track.duration),
                        isPlaying: status.playing,
                    });

                    if (status.didJustFinish) {
                        get().playNext();
                    }
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

    // 🌟 DIL (HEART) PAR CLICK KARNE SE SQLITE MEIN BHI SAVE/REMOVE HOGA
    toggleFavorite: async (track: Track) => {
        const { favoriteTracks } = get();
        const isFav = favoriteTracks.includes(track.id);

        if (isFav) {
            await removeFavoriteDB(track.id); // DB se hatao
            set({ favoriteTracks: favoriteTracks.filter(id => id !== track.id) }); // State se hatao
        } else {
            await addFavoriteDB(track); // DB mein dalo
            set({ favoriteTracks: [...favoriteTracks, track.id] }); // State mein dalo
        }
    },

    toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
    toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
}));