import { create } from 'zustand';
import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';

// ⚠️ YAHAN APNA BACKEND URL LIKHO (Taake store bhi API call kar sake)
const BACKEND_URL = 'http://10.20.23.43:5000';

export interface Track {
    id: string;
    title: string;
    artist: string;
    image: string;
    duration: number; // in seconds
    sourceType: 'local' | 'youtube';
    audioFormat?: string;
    fileSize?: string;
    uri?: string;
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

    playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
    playNext: () => Promise<void>;
    playPrevious: () => Promise<void>;
    togglePlay: () => Promise<void>;
    seek: (position: number) => Promise<void>;
    setPlayerVisible: (visible: boolean) => void;
    toggleFavorite: (trackId: string) => void;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
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

            // 🌟 DYNAMIC URL FETCHING (Agar URL nahi hai toh fetch karo)
            let streamUrl = track.uri;

            if (!streamUrl && track.sourceType === 'youtube') {
                try {
                    const response = await fetch(`${BACKEND_URL}/api/stream?id=${track.id}`);
                    const data = await response.json();
                    if (data.stream_url) {
                        streamUrl = data.stream_url;
                        track.uri = streamUrl; // State aur queue update karne ke liye store kar lo
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

            // Ab track.uri ki jagah hum fetched streamUrl use kar rahe hain
            playerInstance = createAudioPlayer(streamUrl);

            statusSubscription = playerInstance.addListener('playbackStatusUpdate', (status) => {
                if (status.isLoaded) {
                    set({
                        position: Math.floor(status.currentTime || 0),
                        duration: Math.floor(status.duration || track.duration),
                        isPlaying: status.playing,
                    });

                    if (status.didJustFinish) {
                        get().playNext(); // Agla gaana khud play hoga!
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

    toggleFavorite: (trackId) => set((state) => ({
        favoriteTracks: state.favoriteTracks.includes(trackId)
            ? state.favoriteTracks.filter(id => id !== trackId)
            : [...state.favoriteTracks, trackId]
    })),

    toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
    toggleRepeat: () => set((state) => ({ isRepeat: !state.isRepeat })),
}));