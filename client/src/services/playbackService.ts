import TrackPlayer, { Event, PlayerCommand, PlaybackState, BackgroundEvent } from '@rntp/player';
import { usePlaybackStore } from '../store/usePlaybackStore';

export async function setupPlayer() {
    try {
        TrackPlayer.setupPlayer({
            android: {
                taskRemovedBehavior: 'continue',
            }
        });
        TrackPlayer.setCommands({
            capabilities: [
                PlayerCommand.PlayPause,
                PlayerCommand.Next,
                PlayerCommand.Previous,
                PlayerCommand.Seek,
            ],
            handling: 'js',
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
    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        try {
            TrackPlayer.play();
        } catch (err) {
            console.error('RemotePlay error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        try {
            TrackPlayer.pause();
        } catch (err) {
            console.error('RemotePause error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        try {
            await usePlaybackStore.getState().playNext();
        } catch (err) {
            console.error('RemoteNext error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        try {
            await usePlaybackStore.getState().playPrevious();
        } catch (err) {
            console.error('RemotePrevious error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        try {
            TrackPlayer.clear();
            usePlaybackStore.getState().setPlayerVisible(false);
        } catch (err) {
            console.error('RemoteStop error:', err);
        }
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        try {
            TrackPlayer.seekTo(event.position);
        } catch (err) {
            console.error('RemoteSeek error:', err);
        }
    });

    // Auto-advance track when current track ends
    TrackPlayer.addEventListener(Event.PlaybackStateChanged, async (event) => {
        if (event.state === PlaybackState.Ended) {
            try {
                await usePlaybackStore.getState().playNext();
            } catch (err) {
                console.error('PlaybackStateChanged Ended error:', err);
            }
        }
    });

    // Keep Zustand store state synced
    TrackPlayer.addEventListener(Event.IsPlayingChanged, (event) => {
        usePlaybackStore.setState({ isPlaying: event.playing });
    });
}

export async function backgroundPlaybackService(event: BackgroundEvent) {
    switch (event.type) {
        case Event.RemotePlay:
            TrackPlayer.play();
            break;
        case Event.RemotePause:
            TrackPlayer.pause();
            break;
        case Event.RemoteNext:
            try {
                await usePlaybackStore.getState().playNext();
            } catch (err) {
                console.error('RemoteNext background error:', err);
            }
            break;
        case Event.RemotePrevious:
            try {
                await usePlaybackStore.getState().playPrevious();
            } catch (err) {
                console.error('RemotePrevious background error:', err);
            }
            break;
        case Event.RemoteStop:
            TrackPlayer.clear();
            usePlaybackStore.getState().setPlayerVisible(false);
            break;
        case Event.RemoteSeek:
            TrackPlayer.seekTo(event.position);
            break;
    }
}
