import TrackPlayer, { Event, PlayerCommand } from '@rntp/player';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { addToHistoryDB } from '@/services/db';

export async function setupPlayer() {
    try {
        await TrackPlayer.setupPlayer({
            contentType: 'music',
            handleAudioBecomingNoisy: true,
            cache: {
                maxSizeBytes: 500 * 1024 * 1024 // 500 MB
            },
            android: {
                taskRemovedBehavior: 'continue',
            }
        });

        await TrackPlayer.setCommands({
            capabilities: [
                PlayerCommand.PlayPause,
                PlayerCommand.Next,
                PlayerCommand.Previous,
                PlayerCommand.Seek,
            ],
        });
        return true;
    } catch (setupError: any) {
        if (setupError?.message?.includes('already set up')) {
            return true;
        }
        console.error('[PlaybackService] setupPlayer error:', setupError);
        return false;
    }
}

async function resolveAdjacentTracks(currentIndex: number) {
    try {
        const store = usePlaybackStore.getState();
        const queue = store.queue;
        if (queue.length === 0) return;

        const nativeQueue = await TrackPlayer.getQueue();

        // Resolve next track (index + 1)
        const nextIndex = currentIndex + 1;
        if (nextIndex < queue.length) {
            const nextTrack = queue[nextIndex];
            const nextMediaItem = nativeQueue[nextIndex];
            if (nextMediaItem && nextMediaItem.url === 'http://placeholder.mp3') {
                console.log(`[PlaybackService] Pre-resolving next track URL for index ${nextIndex}: ${nextTrack.title}`);
                const resolvedUrl = await store.resolveTrackUri(nextTrack);
                if (resolvedUrl) {
                    await TrackPlayer.replaceMediaItem(nextIndex, {
                        ...nextMediaItem,
                        url: resolvedUrl
                    });
                    console.log(`[PlaybackService] Updated next track URL in native queue`);
                }
            }
        }

        // Resolve previous track (index - 1)
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
            const prevTrack = queue[prevIndex];
            const prevMediaItem = nativeQueue[prevIndex];
            if (prevMediaItem && prevMediaItem.url === 'http://placeholder.mp3') {
                console.log(`[PlaybackService] Pre-resolving previous track URL for index ${prevIndex}: ${prevTrack.title}`);
                const resolvedUrl = await store.resolveTrackUri(prevTrack);
                if (resolvedUrl) {
                    await TrackPlayer.replaceMediaItem(prevIndex, {
                        ...prevMediaItem,
                        url: resolvedUrl
                    });
                    console.log(`[PlaybackService] Updated previous track URL in native queue`);
                }
            }
        }
    } catch (err) {
        console.error('[PlaybackService] resolveAdjacentTracks error:', err);
    }
}

export async function playbackService() {
    console.log('[PlaybackService] Registering foreground event listeners');

    TrackPlayer.addEventListener(Event.IsPlayingChanged, (event) => {
        usePlaybackStore.setState({ isPlaying: event.playing });
        if (event.playing) {
            const store = usePlaybackStore.getState();
            if (store.playRequestTimestamp > 0) {
                const latency = Date.now() - store.playRequestTimestamp;
                console.log(`[PlaybackService] 🌟 SONG STARTED PLAYING! Total latency to start audio: ${latency}ms for track: "${store.currentTrack?.title}"`);
            }
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
        usePlaybackStore.setState({
            position: event.position,
            duration: event.duration
        });
    });

    TrackPlayer.addEventListener(Event.MediaItemTransition, async (event) => {
        try {
            const { item, index } = event;
            if (index === undefined || index === null) return;

            const store = usePlaybackStore.getState();
            const queue = store.queue;
            const currentTrack = queue[index];

            if (currentTrack) {
                const isSameTrack = store.currentTrack?.id === currentTrack.id;

                if (!isSameTrack) {
                    // Sync Zustand
                    usePlaybackStore.setState({
                        currentIndex: index,
                        currentTrack: currentTrack,
                    });

                    // Fetch lyrics and save history
                    store.fetchLyricsForTrack(currentTrack);
                    addToHistoryDB(currentTrack);
                }

                // Handle transition to placeholder
                if (item && item.url === 'http://placeholder.mp3') {
                    console.log(`[PlaybackService] Active item at index ${index} is placeholder. Resolving immediately...`);
                    try {
                        await TrackPlayer.pause();
                    } catch (pauseErr) {}

                    const resolvedUrl = await store.resolveTrackUri(currentTrack);
                    if (resolvedUrl) {
                        await TrackPlayer.replaceMediaItem(index, {
                            ...item,
                            url: resolvedUrl
                        });
                        await TrackPlayer.play();
                    }
                }

                // Pre-resolve neighbors (with 500ms delay to avoid server clogging)
                if (!isSameTrack) {
                    setTimeout(() => {
                        resolveAdjacentTracks(index).catch(err => {
                            console.error('[PlaybackService] Delayed resolveAdjacentTracks error:', err);
                        });
                    }, 500);
                }
            }
        } catch (err) {
            console.error('[PlaybackService] MediaItemTransition error:', err);
        }
    });
}

export async function backgroundPlaybackService(event: any) {
    console.log('[PlaybackService] Background playback service event:', event.type);

    if (event.type === Event.MediaItemTransition) {
        try {
            const { item, index } = event;
            if (index === undefined || index === null) return;

            const store = usePlaybackStore.getState();
            const queue = store.queue;
            const currentTrack = queue[index];

            if (currentTrack) {
                const isSameTrack = store.currentTrack?.id === currentTrack.id;
                if (!isSameTrack) {
                    usePlaybackStore.setState({
                        currentIndex: index,
                        currentTrack: currentTrack,
                    });
                    store.fetchLyricsForTrack(currentTrack);
                    addToHistoryDB(currentTrack);
                }

                // Resolve placeholder URL in the background
                if (item && item.url === 'http://placeholder.mp3') {
                    console.log(`[PlaybackService Background] Resolving placeholder for track index ${index}: ${currentTrack.title}`);
                    try {
                        await TrackPlayer.pause();
                    } catch (pauseErr) {}

                    const resolvedUrl = await store.resolveTrackUri(currentTrack);
                    if (resolvedUrl) {
                        await TrackPlayer.replaceMediaItem(index, {
                            ...item,
                            url: resolvedUrl
                        });
                        await TrackPlayer.play();
                    }
                }

                // Pre-resolve neighbors (with 500ms delay to avoid server clogging)
                if (!isSameTrack) {
                    setTimeout(() => {
                        resolveAdjacentTracks(index).catch(err => {
                            console.error('[PlaybackService Background] Delayed resolveAdjacentTracks error:', err);
                        });
                    }, 500);
                }
            }
        } catch (err) {
            console.error('[PlaybackService Background] MediaItemTransition error:', err);
        }
    }
}

