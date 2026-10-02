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
                notification: {
                    channelId: 'omniplayer_media_channel',
                    channelName: 'OmniPlayer Media Playback',
                    smallIcon: 'notification_icon'
                }
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


export async function playbackService() {
    console.log('[PlaybackService] Registering foreground event listeners');

    TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
        console.error('[PlaybackService] Playback error:', event.code, '-', event.message);
        if (event.code === 'source') {
            // NOTE: Do NOT clear the PO token here. The token is validated by the GVS probe
            // in InnerTubeClient.getStreamUrl (which clears it on 401/403). A 'source' error
            // can also be caused by transient network issues, and clearing the token forces
            // a ~10s re-mint for every blip. See the GVS probe log for the real HTTP status.
            console.log('[PlaybackService] Source error detected. PO token left intact (see GVS probe log).');
        }
    });

    TrackPlayer.addEventListener(Event.PlaybackStateChanged, (event) => {
        console.log('[PlaybackService] Playback state changed:', event.state);
        if (event.state === 'ended') {
            console.log('[PlaybackService] Track ended -> advancing to next track');
            usePlaybackStore.getState().playNext();
        }
    });

    // Remote lockscreen and notification media controls
    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        console.log('[PlaybackService] Remote Next received');
        usePlaybackStore.getState().playNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        console.log('[PlaybackService] Remote Previous received');
        usePlaybackStore.getState().playPrevious();
    });

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        TrackPlayer.seekTo(event.position);
    });

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
            if (!item) return;

            const store = usePlaybackStore.getState();
            const queue = store.queue;
            const currentTrackIndex = queue.findIndex(t => t.id === item.mediaId);
            const currentTrack = currentTrackIndex !== -1 ? queue[currentTrackIndex] : (index !== undefined ? queue[index] : null);

            if (currentTrack) {
                const targetIndex = currentTrackIndex !== -1 ? currentTrackIndex : (index || 0);
                const isSameTrack = store.currentTrack?.id === currentTrack.id;

                if (!isSameTrack) {
                    usePlaybackStore.setState({
                        currentIndex: targetIndex,
                        currentTrack: currentTrack,
                    });

                    store.fetchLyricsForTrack(currentTrack);
                    addToHistoryDB(currentTrack);

                    setTimeout(() => {
                        store.resolveAdjacentTracks(targetIndex).catch(err => {
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

    if (event.type === Event.RemoteNext) {
        usePlaybackStore.getState().playNext();
    } else if (event.type === Event.RemotePrevious) {
        usePlaybackStore.getState().playPrevious();
    } else if (event.type === Event.RemotePlay) {
        await TrackPlayer.play();
    } else if (event.type === Event.RemotePause) {
        await TrackPlayer.pause();
    } else if (event.type === Event.RemoteSeek) {
        await TrackPlayer.seekTo(event.position);
    } else if (event.type === Event.PlaybackStateChanged && event.state === 'ended') {
        usePlaybackStore.getState().playNext();
    } else if (event.type === Event.MediaItemTransition && event.item) {
        const store = usePlaybackStore.getState();
        const queue = store.queue;
        const currentTrackIndex = queue.findIndex(t => t.id === event.item.mediaId);
        const currentTrack = currentTrackIndex !== -1 ? queue[currentTrackIndex] : (event.index !== undefined ? queue[event.index] : null);

        if (currentTrack) {
            const targetIndex = currentTrackIndex !== -1 ? currentTrackIndex : (event.index || 0);
            if (store.currentTrack?.id !== currentTrack.id) {
                usePlaybackStore.setState({
                    currentIndex: targetIndex,
                    currentTrack: currentTrack,
                });
                store.fetchLyricsForTrack(currentTrack);
                addToHistoryDB(currentTrack);
                setTimeout(() => {
                    store.resolveAdjacentTracks(targetIndex).catch(err => {
                        console.error('[PlaybackService Background] Delayed resolveAdjacentTracks error:', err);
                    });
                }, 500);
            }
        }
    }
}

