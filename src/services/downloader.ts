import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { FFmpegKit, ReturnCode, FFmpegSession } from '@wokcito/ffmpeg-kit-react-native';
import { Track, DownloadOptions, usePlaybackStore } from '@/store/usePlaybackStore';
import { InnerTubeClient } from './InnerTubeClient';
import { Platform } from 'react-native';

// Helper to clean LRC lyrics format into plain text
export const cleanLrcToPlainText = (lrc: string): string => {
    if (!lrc) return '';
    // Strip synced timestamps like [00:00.00] or [00:00.000]
    return lrc.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
};

// Helper to extract the primary artist name for robust iTunes search results
export const getPrimaryArtist = (artist: string): string => {
    if (!artist) return '';
    let clean = artist.split('•')[0];
    clean = clean.split(',')[0];
    clean = clean.split('&')[0];
    clean = clean.split('feat.')[0];
    clean = clean.split('featuring')[0];
    clean = clean.split('and')[0];
    return clean.trim();
};

// Helper to transform YouTube Music artwork URL into 1000x1000 Ultra-HD resolution
export const getHDYouTubeArtworkUrl = (url: string): string => {
    if (!url) return '';
    let hdUrl = url;
    if (hdUrl.includes('=w')) {
        hdUrl = hdUrl.replace(/=w\d+-h\d+/, '=w1000-h1000');
    } else if (hdUrl.includes('=s')) {
        hdUrl = hdUrl.replace(/=s\d+/, '=s1000');
    } else if (hdUrl.includes('-l90-rj') && !hdUrl.includes('=w')) {
        hdUrl = hdUrl + '=w1000-h1000';
    }
    return hdUrl;
};

// Helper to search and enrich metadata via iTunes Search API
export const fetchiTunesMetadata = async (
    trackTitle: string,
    artistName: string
): Promise<{ title: string; artist: string; album: string; year: string; genre: string; artworkUrl: string } | null> => {
    try {
        const cleanTitle = trackTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const cleanArtist = artistName.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const query = encodeURIComponent(`${cleanTitle} ${cleanArtist}`);
        
        console.log(`[Downloader] Querying iTunes Search API for: "${cleanTitle} - ${cleanArtist}"`);
        const response = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
        
        if (!response.ok) {
            throw new Error(`iTunes API returned HTTP status ${response.status}`);
        }
        
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const rawArtwork = result.artworkUrl100 || '';
            // Request 1000x1000 Ultra-HD cover art instead of the default 100x100 thumbnail
            const hdArtwork = rawArtwork.replace('100x100bb.jpg', '1000x1000bb.jpg');
            
            const releaseDate = result.releaseDate || '';
            const year = releaseDate ? new Date(releaseDate).getFullYear().toString() : '';

            return {
                title: result.trackName || trackTitle,
                artist: result.artistName || artistName,
                album: result.collectionName || 'Unknown Album',
                year: year || 'Unknown Year',
                genre: result.primaryGenreName || 'Unknown Genre',
                artworkUrl: hdArtwork || rawArtwork
            };
        }
        return null;
    } catch (err) {
        console.warn('[Downloader] iTunes metadata fetch failed:', err);
        return null;
    }
};

export const fetchFallbackLyrics = async (
    trackName: string,
    artistName: string
): Promise<{ plainLyrics: string; syncedLyrics: string } | null> => {
    try {
        const cleanTitle = trackName.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const cleanArtist = artistName.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
        
        console.log(`[Downloader] Pinging LRCLIB get API: ${getUrl}`);
        const response = await fetch(getUrl);
        
        if (response.ok) {
            const data = await response.json();
            if (data.instrumental) {
                return { plainLyrics: 'Instrumental Track', syncedLyrics: '[00:00.00] Instrumental' };
            }
            return {
                plainLyrics: data.plainLyrics || '',
                syncedLyrics: data.syncedLyrics || data.plainLyrics || ''
            };
        }
        
        const searchQuery = encodeURIComponent(`${cleanTitle} ${cleanArtist}`);
        const searchUrl = `https://lrclib.net/api/search?q=${searchQuery}`;
        console.log(`[Downloader] LRCLIB get failed, searching LRCLIB: ${searchUrl}`);
        const searchRes = await fetch(searchUrl);
        
        if (searchRes.ok) {
            const results = await searchRes.json();
            if (results && results.length > 0) {
                const match = results[0];
                if (match.instrumental) {
                    return { plainLyrics: 'Instrumental Track', syncedLyrics: '[00:00.00] Instrumental' };
                }
                return {
                    plainLyrics: match.plainLyrics || '',
                    syncedLyrics: match.syncedLyrics || match.plainLyrics || ''
                };
            }
        }
        return null;
    } catch (err) {
        console.warn('[Downloader] LRCLIB fallback lyrics fetch failed:', err);
        return null;
    }
};

export const downloadTrackFile = async (
    track: Track, 
    options: DownloadOptions, 
    onProgress?: (progress: number) => void,
    onStatusChange?: (status: 'downloading' | 'stitching') => void
): Promise<string | null> => {
    const trackId = track.id;
    
    // Store list of files to delete in finally block for strict GC
    const filesToDelete: string[] = [];

    try {
        if (track.sourceType === 'local') {
            console.warn("[Downloader] Track is already local!");
            return track.uri || null;
        }

        // 1. Explicit Permissions Check for Premium Mode
        if (options.downloadMode === 'premium') {
            console.log("[Downloader] Requesting Media Library / Storage permissions for Premium Download...");
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                throw new Error("Storage permissions denied. Cannot proceed with Premium Download.");
            }
        }

        onStatusChange?.('downloading');
        console.log(`[Downloader] Fetching stream URL for track ID: ${trackId}`);

        // 2. Fetch raw stream URL directly via InnerTubeClient
        const streamData = await InnerTubeClient.getStreamUrl(trackId);
        const streamUrl = streamData.stream_url;
        if (!streamUrl) {
            throw new Error("No stream URL returned from InnerTube");
        }

        // 3. Determine file extension based on mime type in stream URL
        let extension: string = options.downloadFormat || 'm4a';
        if (streamUrl.includes('mime=audio/webm') || streamUrl.includes('mime=audio%2Fwebm')) {
            extension = 'webm';
        } else if (streamUrl.includes('mime=audio/mp4') || streamUrl.includes('mime=audio%2Fmp4')) {
            extension = 'm4a';
        }
        console.log(`[Downloader] Determined stream file extension: .${extension}`);

        // 4. Sanitization and Metadata enrichment using iTunes helper
        // Immediately sanitize raw artist string by removing 'Song', 'Video' and stray commas
        const sanitizedArtist = track.artist.replace(/\b(Song|Video)\s*[,•|-]?\s*/gi, '').trim() || "Artist";
        const primaryArtist = getPrimaryArtist(sanitizedArtist);
        const iTunesMeta = await fetchiTunesMetadata(track.title, primaryArtist);
        
        // Overwrite title and artist with official iTunes data if available
        const finalTitle = iTunesMeta?.title || track.title;
        const finalArtist = iTunesMeta?.artist || sanitizedArtist;
        const fallbackArtwork = getHDYouTubeArtworkUrl(track.image);

        const metadata = {
            title: finalTitle,
            artist: finalArtist,
            album: iTunesMeta?.album || 'Unknown Album',
            year: iTunesMeta?.year || new Date().getFullYear().toString(),
            genre: iTunesMeta?.genre || 'Pop',
            artworkUrl: iTunesMeta?.artworkUrl || fallbackArtwork
        };

        console.log('[Downloader] Successfully gathered metadata enrichment:', metadata);

        // 5. Download Raw Audio to unique cacheDirectory path
        const rawAudioPath = `${FileSystem.cacheDirectory}temp_raw_${trackId}.${extension}`;
        filesToDelete.push(rawAudioPath);
        console.log(`[Downloader] Downloading raw audio to cache: ${rawAudioPath}`);

        const audioDownloadResumable = FileSystem.createDownloadResumable(
            streamUrl,
            rawAudioPath,
            {},
            (downloadProgress) => {
                if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    onProgress(progress);
                }
            }
        );

        const audioDownloadRes = await audioDownloadResumable.downloadAsync();
        if (!audioDownloadRes || audioDownloadRes.status !== 200) {
            throw new Error(`Failed to download raw audio stream. HTTP status: ${audioDownloadRes?.status}`);
        }

        // 6. Download HD cover art to temporary cache path
        const coverArtPath = `${FileSystem.cacheDirectory}temp_cover_${trackId}.jpg`;
        filesToDelete.push(coverArtPath);
        console.log(`[Downloader] Downloading HD cover art to cache: ${coverArtPath}`);
        if (metadata.artworkUrl) {
            try {
                const coverDownloadRes = await FileSystem.downloadAsync(metadata.artworkUrl, coverArtPath);
                if (!coverDownloadRes || coverDownloadRes.status !== 200) {
                    throw new Error(`Failed to download cover art. HTTP status: ${coverDownloadRes?.status}`);
                }
            } catch (coverErr) {
                console.warn('[Downloader] Failed to cache HD cover art, using fallback:', coverErr);
            }
        }

        // 7. Fetch and prepare lyrics
        let lyricsText = '';
        let rawLrcText = '';
        try {
            const lyricsData = await InnerTubeClient.getLyrics(track.title, primaryArtist, trackId);
            if (lyricsData && lyricsData.lyrics) {
                rawLrcText = lyricsData.lyrics;
                lyricsText = lyricsData.type === 'synced' ? cleanLrcToPlainText(lyricsData.lyrics) : lyricsData.lyrics;
            }
        } catch (lyrErr) {
            console.warn('[Downloader] Failed to fetch lyrics for caching:', lyrErr);
        }

        // LRCLIB API Fallback Check
        const isLyricsUnavailable = (text: string | null | undefined): boolean => {
            if (!text) return true;
            const cleaned = text.toLowerCase().trim();
            return (
                cleaned === '' ||
                cleaned.includes('lyrics not available') ||
                cleaned.includes('no lyrics found') ||
                cleaned.includes('instrumental')
            );
        };

        if (isLyricsUnavailable(lyricsText)) {
            console.log(`[Downloader] Primary lyrics unavailable for "${finalTitle}". Fetching fallback from LRCLIB...`);
            const fallbackLyrics = await fetchFallbackLyrics(finalTitle, getPrimaryArtist(finalArtist));
            if (fallbackLyrics && (fallbackLyrics.plainLyrics || fallbackLyrics.syncedLyrics)) {
                lyricsText = fallbackLyrics.plainLyrics;
                rawLrcText = fallbackLyrics.syncedLyrics;
                console.log(`[Downloader] Successfully fetched fallback lyrics from LRCLIB!`);
            }
        }

        console.log(`[Downloader] Pre-processing completed for: "${finalTitle}"`);

        // 8. Handle save execution based on mode
        if (options.downloadMode === 'fast') {
            // Fast mode: copy straight to internal document folder (no transcode or cover art embedding)
            const safeTitle = finalTitle.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Track";
            const safeArtist = getPrimaryArtist(finalArtist).replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Artist";
            const fileName = `${safeTitle} - ${safeArtist} [${trackId}].${extension}`;

            const downloadDir = FileSystem.documentDirectory + 'OmniPlayer/';
            const dirInfo = await FileSystem.getInfoAsync(downloadDir);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
            }
            const finalFileUri = downloadDir + fileName;

            await FileSystem.moveAsync({
                from: rawAudioPath,
                to: finalFileUri
            });

            console.log(`[Downloader] Fast Mode - Saved to: ${finalFileUri}`);
            return finalFileUri;
        } else {
            // Premium mode: FFmpeg stitching, metadata injection, and Public Export
            const cleanStringForFilename = (str: string): string => {
                return str
                    .replace(/[^a-zA-Z0-9 ]/g, '') // Strip special characters
                    .replace(/\s+/g, ' ')          // Collapse multiple spaces
                    .trim();
            };
            const safeTitle = cleanStringForFilename(finalTitle) || "Track";
            const safeArtist = cleanStringForFilename(finalArtist) || "Artist";
            const cleanFileName = `${safeTitle} - ${safeArtist}.${options.downloadFormat}`;
            const stitchedOutputPath = `${FileSystem.cacheDirectory}${cleanFileName}`;
            filesToDelete.push(stitchedOutputPath);
            console.log(`[Downloader] Premium mode: Stitching and transcoding audio to: ${stitchedOutputPath}`);

            // Build FFmpeg command arguments
            const ffmpegArgs: string[] = [];
            
            ffmpegArgs.push('-y'); // Overwrite output
            ffmpegArgs.push('-i', rawAudioPath);
            
            const coverExists = await FileSystem.getInfoAsync(coverArtPath).then(info => info.exists);
            if (coverExists) {
                ffmpegArgs.push('-i', coverArtPath);
            }

            ffmpegArgs.push('-map', '0:a');
            if (coverExists) {
                ffmpegArgs.push('-map', '1:v');
            }

            // Audio transcode options
            if (options.downloadFormat === 'mp3') {
                ffmpegArgs.push('-c:a', 'libmp3lame');
            } else {
                ffmpegArgs.push('-c:a', 'aac');
            }
            ffmpegArgs.push('-b:a', `${options.downloadQuality}k`);

            // Attach cover art as video stream
            if (coverExists) {
                ffmpegArgs.push('-c:v', 'mjpeg');
                ffmpegArgs.push('-disposition:v', 'attached_pic');
            }

            // Metadata tags
            ffmpegArgs.push('-metadata', `title=${metadata.title}`);
            ffmpegArgs.push('-metadata', `artist=${metadata.artist}`);
            ffmpegArgs.push('-metadata', `album=${metadata.album}`);
            ffmpegArgs.push('-metadata', `date=${metadata.year}`);
            ffmpegArgs.push('-metadata', `genre=${metadata.genre}`);

            // Lyrics tags for standard players
            if (lyricsText) {
                ffmpegArgs.push('-metadata', `lyrics=${lyricsText}`);
                ffmpegArgs.push('-metadata', `USLT=${lyricsText}`);
            }

            // Output path
            ffmpegArgs.push(stitchedOutputPath);

            onStatusChange?.('stitching');
            console.log(`[Downloader] Running FFmpeg with arguments:`, ffmpegArgs);

            // Execute FFmpeg kit asynchronously and await it via Promise
            const session = await new Promise<FFmpegSession>((resolve, reject) => {
                FFmpegKit.executeWithArgumentsAsync(
                    ffmpegArgs,
                    (ffmpegSession) => resolve(ffmpegSession),
                    (log) => {
                        // Suppress verbose logging to prevent console flooding
                    },
                    (stats) => {
                        // Statistics callbacks if needed
                    }
                ).catch(reject);
            });

            const returnCode = await session.getReturnCode();
            if (!ReturnCode.isSuccess(returnCode)) {
                const ffmpegLogs = await session.getAllLogsAsString();
                throw new Error(`FFmpeg stitching failed with code ${returnCode.getValue()}. Logs: ${ffmpegLogs}`);
            }

            console.log("[Downloader] FFmpeg Stitching successful!");

            // Move stitched output directly to device's public Media Library
            console.log("[Downloader] Saving stitched file to public Media Library...");
            const audioAsset = await MediaLibrary.createAssetAsync(encodeURI(stitchedOutputPath));
            console.log(`[Downloader] Created audio asset in MediaLibrary: ${audioAsset.uri}`);

            // Synced LRC file sidecar export using StorageAccessFramework (SAF) for Scoped Storage compliance
            if (options.exportSeparateLrcFile && rawLrcText) {
                if (Platform.OS === 'android') {
                    try {
                        const store = usePlaybackStore.getState();
                        let directoryUri = store.lrcExportDirectoryUri;

                        if (!directoryUri) {
                            console.log("[Downloader] lrcExportDirectoryUri is null, requesting directory permissions from user...");
                            const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                            if (permissions.granted) {
                                directoryUri = permissions.directoryUri;
                                store.setLrcExportDirectoryUri(directoryUri);
                                console.log("[Downloader] Directory permissions granted. Saved URI:", directoryUri);
                            } else {
                                console.warn("[Downloader] Directory permissions denied. Skipping LRC export.");
                            }
                        }

                        if (directoryUri) {
                            let fileName = `${safeTitle} - ${safeArtist}`;
                            if (!fileName.toLowerCase().endsWith('.lrc')) {
                                fileName += '.lrc';
                            }
                            console.log(`[Downloader] Creating LRC file via SAF: ${fileName}`);
                            
                            try {
                                const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                                    directoryUri,
                                    fileName,
                                    'application/octet-stream'
                                );

                                await FileSystem.writeAsStringAsync(fileUri, rawLrcText, {
                                    encoding: FileSystem.EncodingType.UTF8
                                });
                                console.log(`[Downloader] Synced LRC sidecar written successfully using SAF to: ${fileUri}`);
                            } catch (writeErr) {
                                console.warn('[Downloader] SAF write failed. Clearing lrcExportDirectoryUri to prompt next time:', writeErr);
                                store.setLrcExportDirectoryUri(null);
                            }
                        }
                    } catch (lrcErr) {
                        console.warn('[Downloader] SAF LRC sidecar export failed:', lrcErr);
                    }
                }
            }

            console.log(`[Downloader] Premium download completed successfully for "${track.title}"!`);
            return audioAsset.uri;
        }

    } catch (error) {
        console.error("[Downloader] ❌ Error during download processing:", error);
        return null;
    } finally {
        // Strict Garbage Collection - clean up all temporary cached items to prevent storage leaks
        console.log("[Downloader] Running strict garbage collection of temporary files...");
        for (const tempPath of filesToDelete) {
            try {
                const info = await FileSystem.getInfoAsync(tempPath);
                if (info.exists) {
                    await FileSystem.deleteAsync(tempPath, { idempotent: true });
                    console.log(`[Downloader GC] Successfully deleted temp file: ${tempPath}`);
                }
            } catch (gcErr) {
                console.warn(`[Downloader GC] Failed to delete: ${tempPath}`, gcErr);
            }
        }
    }
};