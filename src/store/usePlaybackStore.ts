import { create } from 'zustand';
import TrackPlayer from '@rntp/player';
import { setupPlayer } from '@/services/playbackService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  addFavoriteDB, 
  removeFavoriteDB, 
  getFavoritesDB, 
  addToHistoryDB, 
  getHistoryDB, 
  getDownloadDB,
  addDownloadDB,
  addPlaylistTrackDB,
  savePlaylistMetadataDB 
} from '@/services/db';
import * as FileSystem from 'expo-file-system/legacy';
import { downloadTrackFile } from '@/services/downloader';
import { Alert } from 'react-native';
import { InnerTubeClient } from '@/services/InnerTubeClient';
import { extractLocalMetadata } from '@/services/metadata';
import { PoTokenManager } from '@/services/PoTokenManager';

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
    headers?: any;
}

export interface DownloadOptions {
    downloadMode: 'fast' | 'premium';
    downloadFormat: 'm4a' | 'mp3';
    downloadQuality: '128' | '256';
    exportSeparateLrcFile: boolean;
}

export interface DownloadQueueItem {
    id: string;
    track: Track;
    playlistId?: string;
    playlistName?: string;
    playlistImage?: string;
    totalSongs?: number;
    downloadMode: 'fast' | 'premium';
    downloadFormat: 'm4a' | 'mp3';
    downloadQuality: '128' | '256';
    exportSeparateLrcFile: boolean;
    status: 'queued' | 'downloading' | 'stitching' | 'completed' | 'failed';
    progress: number;
    error?: string;
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
    playRequestTimestamp: number;

    // 🌟 ACCOUNT / AUTH STATE
    accountInfo: { name: string; avatar: string } | null;
    fetchAccountInfo: () => Promise<void>;

    // 🌟 PO TOKEN STATE
    poToken: string | null;
    visitorData: string | null;
    poTokenTimestamp: number | null;
    isPoTokenWebViewVisible: boolean;
    poTokenTargetVideoId: string | null;
    setPoToken: (poToken: string) => void;
    setVisitorData: (visitorData: string) => void;
    clearPoToken: () => void;
    waitForPoToken: (videoId: string) => Promise<string | null>;

    // 🌟 LYRICS CACHING STATE
    currentLyrics: ParsedLyric[];
    isLyricsLoading: boolean;
    lyricsError: string | null;
    loadedLyricsTrackId: string | null;

    nowPlayingPlaylist: { id: string; name: string; image?: string; type: 'online' | 'local' } | null;
    setNowPlayingPlaylist: (playlist: { id: string; name: string; image?: string; type: 'online' | 'local' } | null) => void;

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
    syncWithNativePlayer: () => Promise<void>;
    fetchLyricsForTrack: (track: Track) => Promise<void>;
    resolveTrackUri: (track: Track) => Promise<string | undefined>;
    resolveAdjacentTracks: (currentIndex: number) => Promise<void>;

    // 🌟 DOWNLOAD PREFERENCES STATE
    downloadMode: 'fast' | 'premium';
    downloadFormat: 'm4a' | 'mp3';
    downloadQuality: '128' | '256';
    exportSeparateLrcFile: boolean;
    lrcExportDirectoryUri: string | null;

    setDownloadMode: (mode: 'fast' | 'premium') => void;
    setDownloadFormat: (format: 'm4a' | 'mp3') => void;
    setDownloadQuality: (quality: '128' | '256') => void;
    setExportSeparateLrcFile: (exportLrc: boolean) => void;
    setLrcExportDirectoryUri: (uri: string | null) => void;

    // 🌟 DOWNLOAD QUEUE ACTIONS
    downloadQueue: DownloadQueueItem[];
    isDownloadingQueue: boolean;
    currentDownloadProgress: number;
    currentDownloadingTrackId: string | null;
    downloadTrack: (track: Track, options?: DownloadOptions) => Promise<void>;
    downloadPlaylist: (playlistId: string, playlistName: string, playlistImage: string, tracks: Track[], options?: DownloadOptions) => Promise<void>;
    processNextQueueDownload: () => Promise<void>;
    cancelDownload: (queueItemId: string) => void;
    clearFinishedDownloads: () => void;
}

const pendingResolutions = new Map<string, Promise<string | undefined>>();
const sessionStreamUrlCache = new Map<string, { url: string; headers?: any; timestamp: number }>();
const STREAM_URL_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

// Global In-Memory Lyrics Cache Map
const lyricsCacheMap = new Map<string, { lyrics: ParsedLyric[]; error: string | null }>();

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
    playRequestTimestamp: 0,

    accountInfo: null,
    fetchAccountInfo: async () => {
        try {
            const cached = await AsyncStorage.getItem('yt_account_info');
            if (cached) {
                set({ accountInfo: JSON.parse(cached) });
            }
            const cookies = await AsyncStorage.getItem('yt_cookies');
            if (cookies) {
                const live = await InnerTubeClient.getAccountInfo();
                if (live) {
                    set({ accountInfo: live });
                    await AsyncStorage.setItem('yt_account_info', JSON.stringify(live));
                }
            } else {
                set({ accountInfo: null });
            }
        } catch (err) {
            console.error('[PlaybackStore] Error fetching account info:', err);
        }
    },

    // 🌟 PO TOKEN STATE INIT
    poToken: null,
    visitorData: null,
    poTokenTimestamp: null,
    isPoTokenWebViewVisible: true,
    poTokenTargetVideoId: null,
    setPoToken: (poToken) => {
        const visitorData = get().visitorData;
        if (poToken && poToken.length > 50) {
            const timestamp = Date.now();
            set({ poToken, poTokenTimestamp: timestamp });
            console.log(`[PlaybackStore] Real PoToken captured (length: ${poToken.length}).`);
            AsyncStorage.setItem('yt_po_token', poToken).catch(err => 
                console.error('[PlaybackStore] Failed to save poToken:', err)
            );
            AsyncStorage.setItem('yt_po_token_timestamp', String(timestamp)).catch(err => 
                console.error('[PlaybackStore] Failed to save poTokenTimestamp:', err)
            );
            if (visitorData) {
                console.log('[PlaybackStore] Both long PoToken and VisitorData captured. Unmounting WebView.');
                set({ isPoTokenWebViewVisible: false, poTokenTargetVideoId: null });
            }
        } else {
            console.log(`[PlaybackStore] Ignored short/cold-start PoToken (length: ${poToken ? poToken.length : 0})`);
        }
    },
    setVisitorData: (visitorData) => {
        const poToken = get().poToken;
        set({ visitorData });
        AsyncStorage.setItem('yt_visitor_data', visitorData).catch(err => 
            console.error('[PlaybackStore] Failed to save visitorData:', err)
        );
        if (poToken && poToken.length > 50 && visitorData) {
            console.log('[PlaybackStore] Both long PoToken and VisitorData captured. Unmounting WebView.');
            set({ isPoTokenWebViewVisible: false, poTokenTargetVideoId: null });
        }
    },
    clearPoToken: () => {
        set({ poToken: null, poTokenTimestamp: null });
        AsyncStorage.removeItem('yt_po_token').catch(() => {});
        AsyncStorage.removeItem('yt_po_token_timestamp').catch(() => {});
        console.log('[PlaybackStore] Cleared PO Token from memory and storage.');
    },
    waitForPoToken: async (videoId: string): Promise<string | null> => {
        // 1. Is there a fresh valid session token in memory?
        if (PoTokenManager.isSessionTokenFresh()) {
            const token = get().poToken;
            console.log(`[PlaybackStore] 🎯 Using fresh cached PO Token for videoId: ${videoId}`);
            return token;
        }

        // 2. If circuit breaker is open (repeated failures), don't stall; return null to trigger Tier 2
        if (PoTokenManager.isCircuitBreakerTripped()) {
            console.warn('[PlaybackStore] Circuit breaker tripped. Skipping PO Token minting and using Tier 2 fallback.');
            return null;
        }

        // 3. Ensure minter sandbox WebView is mounted
        set({ isPoTokenWebViewVisible: true });

        // 4. Bounded race: Allow up to 1.8s for minting before falling back to ANDROID_VR
        try {
            console.log(`[PlaybackStore] ⏳ Starting background PO Token minting for videoId: ${videoId}`);
            const token = await Promise.race([
                PoTokenManager.mintSessionToken(get().visitorData || undefined),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800))
            ]);

            if (token) {
                console.log(`[PlaybackStore] 🎯 PO Token ready in time for videoId: ${videoId}`);
                return token;
            } else {
                console.log(`[PlaybackStore] ⚡ PO Token minting taking >1.8s. Proceeding with Tier 2 (ANDROID_VR) to avoid playback delay.`);
                return null;
            }
        } catch (err: any) {
            console.warn('[PlaybackStore] PO Token minting error, proceeding with Tier 2 fallback:', err.message);
            return null;
        }
    },

    // 🌟 LYRICS STATE INIT
    currentLyrics: [],
    isLyricsLoading: false,
    lyricsError: null,
    loadedLyricsTrackId: null,

    // 🌟 DOWNLOAD PREFERENCES INIT
    downloadMode: 'fast',
    downloadFormat: 'm4a',
    downloadQuality: '256',
    exportSeparateLrcFile: true,
    lrcExportDirectoryUri: null,

    nowPlayingPlaylist: null,
    setNowPlayingPlaylist: (playlist) => {
        set({ nowPlayingPlaylist: playlist });
        if (playlist) {
            AsyncStorage.setItem('now_playing_playlist', JSON.stringify(playlist)).catch(err => 
                console.error('[PlaybackStore] Failed to save nowPlayingPlaylist:', err)
            );
        } else {
            AsyncStorage.removeItem('now_playing_playlist').catch(err => 
                console.error('[PlaybackStore] Failed to remove nowPlayingPlaylist:', err)
            );
        }
    },

    setDownloadMode: (mode) => set({ downloadMode: mode }),
    setDownloadFormat: (format) => set({ downloadFormat: format }),
    setDownloadQuality: (quality) => set({ downloadQuality: quality }),
    setExportSeparateLrcFile: (exportLrc) => set({ exportSeparateLrcFile: exportLrc }),
    setLrcExportDirectoryUri: (uri) => {
        set({ lrcExportDirectoryUri: uri });
        if (uri) {
            AsyncStorage.setItem('lrc_export_directory_uri', uri).catch(err => 
                console.error('[PlaybackStore] Failed to save lrcExportDirectoryUri:', err)
            );
        } else {
            AsyncStorage.removeItem('lrc_export_directory_uri').catch(err => 
                console.error('[PlaybackStore] Failed to remove lrcExportDirectoryUri:', err)
            );
        }
    },

    // 🌟 DOWNLOAD QUEUE INIT
    downloadQueue: [],
    isDownloadingQueue: false,
    currentDownloadProgress: 0,
    currentDownloadingTrackId: null,

    loadStoreData: async () => {
        try {
            const favs = await getFavoritesDB();
            const hist = await getHistoryDB();
            const cachedUri = await AsyncStorage.getItem('lrc_export_directory_uri');
            const cachedNowPlaying = await AsyncStorage.getItem('now_playing_playlist');
            const nowPlayingPlaylist = cachedNowPlaying ? JSON.parse(cachedNowPlaying) : null;

            // Load cached PO Token and Visitor Data
            const cachedPoToken = await AsyncStorage.getItem('yt_po_token');
            const cachedVisitorData = await AsyncStorage.getItem('yt_visitor_data');
            const cachedTimestampStr = await AsyncStorage.getItem('yt_po_token_timestamp');
            const cachedTimestamp = cachedTimestampStr ? Number(cachedTimestampStr) : 0;

            const MAX_TOKEN_AGE = 3 * 60 * 60 * 1000; // 3 hours
            const isTokenFresh = cachedPoToken && cachedPoToken.length > 50 && cachedTimestamp && (Date.now() - cachedTimestamp < MAX_TOKEN_AGE);

            if (isTokenFresh && cachedVisitorData) {
                console.log(`[PlaybackStore] Loaded fresh cached PO Token from storage (Age: ${Math.round((Date.now() - cachedTimestamp) / 60000)} mins)`);
                set({
                    poToken: cachedPoToken,
                    visitorData: cachedVisitorData,
                    poTokenTimestamp: cachedTimestamp,
                    isPoTokenWebViewVisible: false // Hide WebView since we already have a fresh token!
                });
            } else {
                console.log('[PlaybackStore] Cached PO Token missing or expired. WebView will launch to retrieve a new one.');
                // Always restore the cached visitorData (even without a fresh token) so the
                // prewarm mint binds the new PO token to the same visitorData used in requests.
                // Otherwise the mint binds to '' and GVS rejects the mismatched &pot=.
                set({
                    isPoTokenWebViewVisible: true,
                    ...(cachedVisitorData ? { visitorData: cachedVisitorData } : {})
                });
            }

            set({
                favoriteTracks: favs.map(f => f.id),
                history: hist,
                lrcExportDirectoryUri: cachedUri || null,
                nowPlayingPlaylist
            });
            await get().fetchAccountInfo();
        } catch (error) {
            console.error("Error loading store data:", error);
        }
    },

    syncWithNativePlayer: async () => {
        let attempts = 0;
        const maxAttempts = 4;
        const delayMs = 500;

        const performSync = async (): Promise<boolean> => {
            try {
                await setupPlayer();
                const nativeQueue = await TrackPlayer.getQueue();
                const activeIndex = await TrackPlayer.getActiveMediaItemIndex();
                
                console.log(`[PlaybackStore] syncWithNativePlayer attempt ${attempts + 1}: Queue size = ${nativeQueue?.length}, Active index = ${activeIndex}`);

                if (nativeQueue && nativeQueue.length > 0 && activeIndex !== null && activeIndex !== undefined && activeIndex >= 0) {
                    const reconstructedQueue: Track[] = nativeQueue.map(item => ({
                        id: item.mediaId || 'unknown-id',
                        title: item.title || 'Unknown Title',
                        artist: item.artist || 'Unknown Artist',
                        image: typeof item.artworkUrl === 'string' ? item.artworkUrl : '',
                        duration: item.duration || 0,
                        sourceType: (typeof item.url === 'string' && (item.url.startsWith('file://') || item.url.startsWith('content://'))) ? 'local' : 'youtube',
                        uri: typeof item.url === 'string' ? item.url : ''
                    }));

                    const activeTrack = reconstructedQueue[activeIndex];
                    const isPlaying = await TrackPlayer.isPlaying();
                    const progress = await TrackPlayer.getProgress();

                    set({
                        queue: reconstructedQueue,
                        currentIndex: activeIndex,
                        currentTrack: activeTrack || null,
                        isPlaying,
                        position: progress.position || 0,
                        duration: progress.duration || activeTrack?.duration || 0
                    });

                    if (activeTrack) {
                        get().fetchLyricsForTrack(activeTrack);
                    }
                    console.log(`[PlaybackStore] Synchronized Zustand with Native Player. Playing: ${isPlaying}, Track: ${activeTrack?.title}`);
                    return true;
                }
            } catch (err) {
                console.error('[PlaybackStore] Error during sync attempt:', err);
            }
            return false;
        };

        while (attempts < maxAttempts) {
            const success = await performSync();
            if (success) break;
            attempts++;
            if (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    },

    fetchLyricsForTrack: async (track: Track) => {
        if (!track || !track.id) return;

        // 1. Instant Cache Hit Check (<1ms return)
        const cached = lyricsCacheMap.get(track.id);
        if (cached) {
            console.log(`[PlaybackStore] Instant <1ms lyrics cache hit for: "${track.title}" (${cached.lyrics.length} lines)`);
            set({
                currentLyrics: cached.lyrics,
                lyricsError: cached.error,
                isLyricsLoading: false,
                loadedLyricsTrackId: track.id
            });
            return;
        }

        if (get().loadedLyricsTrackId === track.id) {
            console.log(`[PlaybackStore] Lyrics already active for: ${track.title}`);
            return;
        }

        set({ isLyricsLoading: true, lyricsError: null, currentLyrics: [], loadedLyricsTrackId: null });

        try {
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

            const storeInCacheAndSet = (lyrics: ParsedLyric[], error: string | null) => {
                if (lyrics && lyrics.length > 0) {
                    lyricsCacheMap.set(track.id, { lyrics, error });
                }
                set({
                    currentLyrics: lyrics,
                    lyricsError: error,
                    isLyricsLoading: false,
                    loadedLyricsTrackId: track.id
                });
            };

            // 2. Determine Track Origin Strictly
            const trackUri = typeof track.uri === 'string' ? track.uri : '';
            const isHttpUrl = trackUri.startsWith('http://') || trackUri.startsWith('https://');
            const isFileUri = trackUri.startsWith('file://');
            const isLocalTrack = isFileUri || track.sourceType === 'local';
            const isOnlineTrack = isHttpUrl || track.sourceType === 'youtube' || (!isLocalTrack && track.id && track.id.length === 11);

            // 3. LOCAL TRACK ONLY: Execute .lrc FileSystem check
            if (!isOnlineTrack && isLocalTrack && isFileUri) {
                try {
                    const lrcPath = trackUri.replace(/\.[^/.]+$/, '') + '.lrc';
                    console.log(`[PlaybackStore] Local track detected. Checking for .lrc file at: ${lrcPath}`);
                    const fileInfo = await FileSystem.getInfoAsync(lrcPath);
                    if (fileInfo && fileInfo.exists) {
                        const lrcContent = await FileSystem.readAsStringAsync(lrcPath, { encoding: FileSystem.EncodingType.UTF8 });
                        if (lrcContent && lrcContent.trim().length > 0) {
                            const parsedLyrics = parseLRC(lrcContent);
                            if (parsedLyrics.length > 0) {
                                console.log(`[PlaybackStore] Loaded local .lrc synced lyrics (${parsedLyrics.length} lines)`);
                                storeInCacheAndSet(parsedLyrics, null);
                                return;
                            } else {
                                console.log(`[PlaybackStore] Loaded local .lrc static text`);
                                storeInCacheAndSet([{ time: 0, text: lrcContent }], null);
                                return;
                            }
                        }
                    }
                } catch (lrcErr) {
                    console.warn('[PlaybackStore] Error checking local .lrc:', lrcErr);
                }
            } else {
                console.log(`[PlaybackStore] Online track detected (URI: "${trackUri || 'YouTube'}"). Bypassing local .lrc FileSystem check.`);
            }

            // 4. Check downloads database for offline cached lyrics
            try {
                const download = await getDownloadDB(track.id);
                if (download && download.lyrics && download.lyricsType && download.lyricsType !== 'none') {
                    console.log(`[PlaybackStore] Using offline cached lyrics for: ${track.title}`);
                    if (download.lyricsType === 'synced') {
                        storeInCacheAndSet(parseLRC(download.lyrics), null);
                    } else {
                        storeInCacheAndSet([{ time: 0, text: download.lyrics }], null);
                    }
                    return;
                }
            } catch (dbErr) {
                console.error("[PlaybackStore] DB cached lyrics check error:", dbErr);
            }

            // 5. ONLINE TRACK / FALLBACK: Direct execution of 5-stage online lyrics API fetcher
            let sendTitle = track.title || '';
            let sendArtist = track.artist || '';

            if (track.sourceType === 'local') {
                if (track.title.includes(' - ')) {
                    const parts = track.title.split(' - ');
                    sendArtist = parts[0].trim();
                    sendTitle = parts[1].trim();
                    sendTitle = sendTitle.replace(/\.(mp3|flac|m4a|ogg)$/i, '');
                    sendArtist = sendArtist.replace(/^\d+\.?\s*/, '');
                } else {
                    sendTitle = track.title.replace(/\.(mp3|flac|m4a|ogg)$/i, '');
                    if (!sendArtist && track.artist) {
                        sendArtist = track.artist;
                    }
                }
            }

            const targetId = track.sourceType === 'youtube' || (track.id && track.id.length === 11) ? track.id : '';

            console.log(`[PlaybackStore] Executing Online Lyrics Fetcher -> Title: "${sendTitle}" | Artist: "${sendArtist}" | VideoId: "${targetId}"`);

            const data = await InnerTubeClient.getLyrics(sendTitle, sendArtist, targetId);

            console.log(`[PlaybackStore] Lyrics API response -> Type: "${data.type}" | Source: "${data.source || 'none'}"`);

            if (data.type === 'synced' && data.lyrics) {
                const parsedLyrics = parseLRC(data.lyrics);
                if (parsedLyrics.length > 0) {
                    storeInCacheAndSet(parsedLyrics, null);
                } else {
                    storeInCacheAndSet([{ time: 0, text: data.lyrics }], null);
                }
            } else if (data.type === 'static' && data.lyrics) {
                storeInCacheAndSet([{ time: 0, text: data.lyrics }], null);
            } else {
                storeInCacheAndSet([], 'Lyrics not available');
            }
        } catch (err) {
            console.error(`[PlaybackStore] Error loading lyrics:`, err);
            set({ lyricsError: 'Failed to load lyrics', loadedLyricsTrackId: null });
        } finally {
            set({ isLyricsLoading: false });
        }
    },

    playTrack: async (track: Track, newQueue?: Track[]) => {
        set({ playRequestTimestamp: Date.now() });
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

            // 1. Update local Zustand state first (Silent play: isPlayerVisible is NOT changed to true)
            set({
                currentTrack: track,
                queue: currentQueue,
                currentIndex: activeIndex,
                position: 0,
                duration: track.duration,
                isPlaying: true
            });

            // Save history (lyrics fetching is deferred to after playback starts)
            addToHistoryDB(track);

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

            // Lazily extract local ID3/embedded metadata if local source
            if (track.sourceType === 'local' && resolvedCurrentUrl) {
                try {
                    const meta = await extractLocalMetadata(resolvedCurrentUrl);
                    if (meta) {
                        if (meta.title) track.title = meta.title;
                        if (meta.artist) track.artist = meta.artist;
                        if (meta.artwork) track.image = meta.artwork;
                        set({ currentTrack: { ...track } });
                    }
                } catch (metaErr) {
                    console.warn('[PlaybackStore] Lazy metadata extraction failed:', metaErr);
                }
            }

            // 3. Set queue in player immediately with the resolved URL for the active track.
            const mediaDuration = (track.duration && track.duration > 0) ? track.duration : undefined;
            // CRITICAL: Must send headers (X-Goog-Visitor-Id, Cookie) with the URL.
            // The &pot= in the URL is NOT sufficient alone - GVS needs the visitor
            // header/cookies to validate the token binding. Without headers -> 403.
            console.log(`[PlaybackStore] Active track headers present: ${!!track.headers}`);
            const activeMediaItem = {
                mediaId: track.id,
                url: (resolvedCurrentUrl && track.headers) ? { uri: resolvedCurrentUrl, headers: track.headers } : (resolvedCurrentUrl || ''),
                title: track.title,
                artist: track.artist,
                artworkUrl: track.image,
                duration: mediaDuration
            };

            await TrackPlayer.setMediaItems([activeMediaItem], 0);
            await TrackPlayer.play();

            // Pre-resolve neighbors (with a short delay to allow native player to settle)
            // Also fetch lyrics now that the track is playing, so it doesn't block the JS thread during stream resolution
            setTimeout(() => {
                get().fetchLyricsForTrack(track);
                get().resolveAdjacentTracks(activeIndex).catch(err => {
                    console.error('[PlaybackStore] playTrack resolveAdjacentTracks error:', err);
                });
            }, 500);

        } catch (error) {
            console.error("Audio play error:", error);
        }
    },

    playNext: async () => {
        set({ playRequestTimestamp: Date.now() });
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
        set({ playRequestTimestamp: Date.now() });
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
            const playing = await TrackPlayer.isPlaying();
            if (playing) {
                await TrackPlayer.pause();
            } else {
                await TrackPlayer.play();
            }
        } catch (error) {
            console.error("Toggle play error:", error);
            // Fallback to Zustand state if native call fails
            if (get().isPlaying) {
                await TrackPlayer.pause();
            } else {
                await TrackPlayer.play();
            }
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
        if (!track || !track.id) return undefined;

        // Return existing resolution promise if already running
        if (pendingResolutions.has(track.id)) {
            console.log(`[PlaybackStore] Joining existing stream URL resolution promise for ${track.title}`);
            return pendingResolutions.get(track.id);
        }

        const promise = (async () => {
            try {
                // 1. If it's a local track on device storage, return its file URI
                if (track.sourceType === 'local' || track.uri?.startsWith('file://') || track.uri?.startsWith('content://')) {
                    return track.uri;
                }

                // 2. Check if track has been downloaded locally into downloads DB
                if (track.sourceType === 'youtube') {
                    try {
                        const download = await getDownloadDB(track.id);
                        if (download && download.localPath) {
                            const fileInfo = await FileSystem.getInfoAsync(download.localPath);
                            if (fileInfo.exists) {
                                track.uri = download.localPath;
                                console.log(`[PlaybackStore] Using local downloaded file: ${download.localPath}`);
                                return download.localPath;
                            }
                        }
                    } catch (dbErr) {
                        console.error("[PlaybackStore] Error checking downloads DB:", dbErr);
                    }
                }

                // 3. Check in-memory fresh session cache
                const cached = sessionStreamUrlCache.get(track.id);
                if (cached && (Date.now() - cached.timestamp < STREAM_URL_EXPIRY_MS)) {
                    console.log(`[PlaybackStore] Using fresh session cached stream URL for ${track.title}`);
                    track.uri = cached.url;
                    track.headers = cached.headers;
                    return cached.url;
                }
 
                // 4. Resolve fresh stream URL from InnerTube
                if (track.sourceType === 'youtube') {
                    try {
                        const data = await InnerTubeClient.getStreamUrl(track.id);
                        if (data && data.stream_url) {
                            sessionStreamUrlCache.set(track.id, { url: data.stream_url, headers: data.headers, timestamp: Date.now() });
                            track.uri = data.stream_url;
                            track.headers = data.headers;
                            if (data.duration && (!track.duration || track.duration === 0)) {
                                track.duration = data.duration;
                            }
                            console.log(`[PlaybackStore] Successfully resolved fresh stream URL for ${track.title}`);
                            return data.stream_url;
                        }
                    } catch (err) {
                        console.error("[PlaybackStore] Fresh stream fetch error:", err);
                    }
                }

                return undefined;
            } catch (err) {
                console.error('[PlaybackStore] resolveTrackUri error:', err);
                return undefined;
            } finally {
                pendingResolutions.delete(track.id);
            }
        })();

        pendingResolutions.set(track.id, promise);
        return promise;
    },

    resolveAdjacentTracks: async (currentIndex: number) => {
        try {
            const queue = get().queue;
            if (queue.length === 0) return;

            // Resolve next track (index + 1)
            const nextIndex = currentIndex + 1;
            if (nextIndex < queue.length) {
                const nextTrack = queue[nextIndex];
                console.log(`[PlaybackStore] Pre-resolving next track URL for index ${nextIndex}: ${nextTrack.title}`);
                const resolvedUrl = await get().resolveTrackUri(nextTrack);
                if (resolvedUrl) {
                    const nativeQueue = await TrackPlayer.getQueue();
                    const alreadyInNative = nativeQueue.some(m => m.mediaId === nextTrack.id);
                    if (!alreadyInNative) {
                        const mediaDuration = (nextTrack.duration && nextTrack.duration > 0) ? nextTrack.duration : undefined;
                        await TrackPlayer.addMediaItem({
                            mediaId: nextTrack.id,
                            url: (resolvedUrl && nextTrack.headers) ? { uri: resolvedUrl, headers: nextTrack.headers } : (resolvedUrl || ''),
                            title: nextTrack.title,
                            artist: nextTrack.artist,
                            artworkUrl: nextTrack.image,
                            duration: mediaDuration
                        });
                        console.log(`[PlaybackStore] Appended next track to native queue for gapless playback: ${nextTrack.title}`);
                    }
                }
            }

            // Pre-resolve previous track into session cache
            const prevIndex = currentIndex - 1;
            if (prevIndex >= 0) {
                const prevTrack = queue[prevIndex];
                await get().resolveTrackUri(prevTrack);
            }
        } catch (err) {
            console.error('[PlaybackStore] resolveAdjacentTracks error:', err);
        }
    },

    downloadTrack: async (track: Track, options?: DownloadOptions) => {
        const store = get();
        const activeOptions = options || {
            downloadMode: store.downloadMode,
            downloadFormat: store.downloadFormat,
            downloadQuality: store.downloadQuality,
            exportSeparateLrcFile: store.exportSeparateLrcFile
        };

        // Check if track is already downloaded
        const download = await getDownloadDB(track.id);
        if (download && download.localPath) {
            const fileInfo = await FileSystem.getInfoAsync(download.localPath);
            if (fileInfo.exists) {
                if (activeOptions.downloadMode === 'fast') {
                    Alert.alert("Already Downloaded", "This song is already downloaded offline.");
                    return;
                }
            }
        }

        // Add to queue capturing current preferences
        const queueItem: DownloadQueueItem = {
            id: `${track.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            track,
            ...activeOptions,
            status: 'queued',
            progress: 0
        };

        const updatedQueue = [...store.downloadQueue, queueItem];
        set({ downloadQueue: updatedQueue });
        
        Alert.alert("Download Started", `Adding "${track.title}" to the download queue.`);

        // Start processing if not already running
        const isCurrentlyRunning = store.downloadQueue.some(item => item.status === 'downloading' || item.status === 'stitching');
        if (!isCurrentlyRunning) {
            set({ isDownloadingQueue: true });
            get().processNextQueueDownload();
        }
    },

    downloadPlaylist: async (playlistId: string, playlistName: string, playlistImage: string, tracks: Track[], options?: DownloadOptions) => {
        const store = get();
        const activeOptions = options || {
            downloadMode: store.downloadMode,
            downloadFormat: store.downloadFormat,
            downloadQuality: store.downloadQuality,
            exportSeparateLrcFile: store.exportSeparateLrcFile
        };
        
        // 1. Prepare download queue items
        const newQueueItems: DownloadQueueItem[] = [];
        const timestamp = Date.now();
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            // Check if track is already downloaded
            const download = await getDownloadDB(track.id);
            if (download && download.localPath) {
                const fileInfo = await FileSystem.getInfoAsync(download.localPath);
                if (fileInfo.exists) {
                    // Track is already downloaded, link it to playlist tracks
                    await addPlaylistTrackDB(playlistId, track, download.localPath);
                    continue;
                }
            }
            
            // Not downloaded, add to queue
            newQueueItems.push({
                id: `${track.id}_${timestamp}_${i}`,
                track,
                playlistId,
                playlistName,
                playlistImage,
                totalSongs: tracks.length,
                ...activeOptions,
                status: 'queued',
                progress: 0
            });
        }
        
        if (newQueueItems.length === 0) {
            // All tracks already downloaded, persist playlist metadata immediately
            await savePlaylistMetadataDB(playlistId, playlistName, playlistImage);
            Alert.alert("Success", "All songs in this playlist are already downloaded and saved offline!");
            return;
        }

        // Add to existing downloadQueue
        const updatedQueue = [...store.downloadQueue, ...newQueueItems];
        set({ downloadQueue: updatedQueue });
        
        Alert.alert("Download Started", `Adding ${newQueueItems.length} songs to the download queue.`);

        // Start processing if not already running
        const isCurrentlyRunning = store.downloadQueue.some(item => item.status === 'downloading' || item.status === 'stitching');
        if (!isCurrentlyRunning) {
            set({ isDownloadingQueue: true });
            get().processNextQueueDownload();
        }
    },

    cancelDownload: (queueItemId: string) => {
        const { downloadQueue } = get();
        const itemToCancel = downloadQueue.find(item => item.id === queueItemId);
        
        // Only cancel if it's queued or failed
        if (itemToCancel && (itemToCancel.status === 'queued' || itemToCancel.status === 'failed')) {
            set({
                downloadQueue: downloadQueue.filter(item => item.id !== queueItemId)
            });
        }
    },

    clearFinishedDownloads: () => {
        const { downloadQueue } = get();
        set({
            downloadQueue: downloadQueue.filter(item => item.status !== 'completed' && item.status !== 'failed')
        });
    },

    processNextQueueDownload: async () => {
        const { downloadQueue } = get();
        
        // Find first queued item
        const nextItem = downloadQueue.find(item => item.status === 'queued');
        if (!nextItem) {
            set({ isDownloadingQueue: false, currentDownloadingTrackId: null, currentDownloadProgress: 0 });
            return;
        }

        const { id: queueItemId, track, playlistId, playlistName, playlistImage } = nextItem;
        
        set({ 
            isDownloadingQueue: true,
            currentDownloadingTrackId: track.id, 
            currentDownloadProgress: 0 
        });

        // Update status of this item to 'downloading'
        set((state) => ({
            downloadQueue: state.downloadQueue.map(item => 
                item.id === queueItemId ? { ...item, status: 'downloading', progress: 0 } : item
            )
        }));

        console.log(`[Queue Downloader] Starting download for: ${track.title} (${track.id})`);

        try {
            // Call the refactored download function
            const localUri = await downloadTrackFile(track, {
                downloadMode: nextItem.downloadMode,
                downloadFormat: nextItem.downloadFormat,
                downloadQuality: nextItem.downloadQuality,
                exportSeparateLrcFile: nextItem.exportSeparateLrcFile
            }, (progress: number) => {
                const numericProgress = Math.round(progress * 100);
                set({ currentDownloadProgress: progress });
                set((state) => ({
                    downloadQueue: state.downloadQueue.map(item => 
                        item.id === queueItemId ? { ...item, progress: numericProgress } : item
                    )
                }));
            }, (status: 'downloading' | 'stitching') => {
                set((state) => ({
                    downloadQueue: state.downloadQueue.map(item => 
                        item.id === queueItemId ? { ...item, status, progress: status === 'stitching' ? 95 : item.progress } : item
                    )
                }));
            });

            if (localUri) {
                if (nextItem.downloadMode === 'fast') {
                    // Success: Get file size
                    let fileSize = '';
                    try {
                        const fileInfo = await FileSystem.getInfoAsync(localUri);
                        if (fileInfo.exists) {
                            fileSize = (fileInfo.size / (1024 * 1024)).toFixed(2) + ' MB';
                        }
                    } catch (sizeErr) {
                        console.error("Error getting file size:", sizeErr);
                    }

                    // Fetch lyrics
                    let lyrics = '';
                    let lyricsType = 'none';
                    try {
                        const cleanArtist = track.artist.split('•')[0].trim();
                        const data = await InnerTubeClient.getLyrics(track.title, cleanArtist, track.id);
                        if (data.type && data.type !== 'none') {
                            lyrics = data.lyrics;
                            lyricsType = data.type;
                        }
                    } catch (lyrErr) {
                        console.error("Error fetching lyrics:", lyrErr);
                    }

                    // Write .lrc sidecar file alongside downloaded track
                    if (localUri && lyrics && lyrics.trim().length > 0) {
                        try {
                            const lrcPath = localUri.replace(/\.[^/.]+$/, '') + '.lrc';
                            await FileSystem.writeAsStringAsync(lrcPath, lyrics, { encoding: FileSystem.EncodingType.UTF8 });
                            console.log(`[PlaybackStore] Saved downloaded .lrc sidecar file to: ${lrcPath}`);
                        } catch (lrcWriteErr) {
                            console.warn('[PlaybackStore] Failed to write .lrc sidecar file:', lrcWriteErr);
                        }
                    }

                    // Save to downloads table
                    await addDownloadDB(track, localUri, fileSize, lyrics, lyricsType);

                    // Link to offline playlist
                    if (playlistId) {
                        await addPlaylistTrackDB(playlistId, track, localUri);

                        // Check if playlist is fully completed (no other tracks for this playlist in queue)
                        const remainingForThisPlaylist = get().downloadQueue.filter(item => 
                            item.playlistId === playlistId && item.id !== queueItemId && item.status === 'queued'
                        );
                        if (remainingForThisPlaylist.length === 0) {
                            await savePlaylistMetadataDB(playlistId, playlistName || '', playlistImage || '');
                            console.log(`[Queue Downloader] Playlist ${playlistName} completed and saved offline!`);
                        }
                    }
                } else {
                    console.log(`[Queue Downloader] Premium Download complete. Skipping DB insertion and offline playlist link for public export of: ${track.title}`);
                }

                // Update status of this item to 'completed'
                set((state) => ({
                    downloadQueue: state.downloadQueue.map(item => 
                        item.id === queueItemId ? { ...item, status: 'completed', progress: 100 } : item
                    )
                }));
            } else {
                console.error(`[Queue Downloader] Failed to download track: ${track.title}`);
                set((state) => ({
                    downloadQueue: state.downloadQueue.map(item => 
                        item.id === queueItemId ? { ...item, status: 'failed', progress: 0, error: 'Download failed' } : item
                    )
                }));
            }
        } catch (err: any) {
            console.error(`[Queue Downloader] Error in processing download for ${track.title}:`, err);
            set((state) => ({
                downloadQueue: state.downloadQueue.map(item => 
                    item.id === queueItemId ? { ...item, status: 'failed', progress: 0, error: err?.message || 'Unknown error' } : item
                )
            }));
        } finally {
            // Process next queued download
            get().processNextQueueDownload();
        }
    },
}));

let progressInterval: ReturnType<typeof setInterval> | null = null;
let lastIsPlaying = false;

usePlaybackStore.subscribe((state) => {
    if (state.isPlaying !== lastIsPlaying) {
        lastIsPlaying = state.isPlaying;
        if (state.isPlaying) {
            if (!progressInterval) {
                console.log('[PlaybackStore] Starting progress polling');
                progressInterval = setInterval(async () => {
                    try {
                        const progress = await TrackPlayer.getProgress();
                        usePlaybackStore.setState({
                            position: progress.position || 0,
                            duration: progress.duration || 0
                        });
                    } catch (err) {
                        console.error('[PlaybackStore] Progress polling error:', err);
                    }
                }, 500);
            }
        } else {
            if (progressInterval) {
                console.log('[PlaybackStore] Stopping progress polling');
                clearInterval(progressInterval);
                progressInterval = null;
            }
        }
    }
});