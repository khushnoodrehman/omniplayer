import * as FileSystem from 'expo-file-system/legacy';
import { Track } from '@/store/usePlaybackStore';
import { InnerTubeClient } from './InnerTubeClient';

export const downloadTrackFile = async (
    track: Track, 
    format: string, 
    onProgress?: (progress: number) => void
): Promise<string | null> => {
    try {
        if (track.sourceType === 'local') {
            console.warn("Track is already local!");
            return track.uri || null;
        }

        const trackId = track.id;
        console.log(`[Downloader] Fetching stream URL for track ID: ${trackId}`);

        // 1. Fetch raw stream URL directly via client-side InnerTube
        const streamData = await InnerTubeClient.getStreamUrl(trackId);
        const streamUrl = streamData.stream_url;
        if (!streamUrl) {
            throw new Error("No stream URL returned from InnerTube");
        }

        // 2. Determine correct file extension based on mime type in stream URL
        let extension = format || 'm4a';
        if (streamUrl.includes('mime=audio/webm') || streamUrl.includes('mime=audio%2Fwebm')) {
            extension = 'webm';
        } else if (streamUrl.includes('mime=audio/mp4') || streamUrl.includes('mime=audio%2Fmp4')) {
            extension = 'm4a';
        }
        console.log(`[Downloader] Determined file extension: .${extension}`);

        // 3. Safe file name creation (sanitized and unique via track ID)
        const safeTitle = track.title.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Track";
        const cleanArtist = track.artist.split('•')[0].trim();
        const safeArtist = cleanArtist.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "Artist";
        const fileName = `${safeTitle} - ${safeArtist} [${trackId}].${extension}`;

        // App's internal document folder where files are permanently saved
        const downloadDir = FileSystem.documentDirectory + 'OmniPlayer/';

        // Check if directory exists, if not create it
        const dirInfo = await FileSystem.getInfoAsync(downloadDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
        }

        const fileUri = downloadDir + fileName;

        console.log(`[Downloader] Starting download for: ${track.title}`);
        console.log(`[Downloader] File will be saved at: ${fileUri}`);

        // 4. Create download resumable for tracking progress from raw stream URL
        const downloadResumable = FileSystem.createDownloadResumable(
            streamUrl,
            fileUri,
            {},
            (downloadProgress) => {
                if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
                    const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                    onProgress(progress);
                }
            }
        );

        const downloadRes = await downloadResumable.downloadAsync();

        if (downloadRes && downloadRes.status === 200) {
            console.log(`[Downloader] ✅ Success! Saved at:`, downloadRes.uri);
            return downloadRes.uri;
        } else {
            console.error("[Downloader] ❌ Download failed with status:", downloadRes ? downloadRes.status : 'unknown');
            return null;
        }
    } catch (error) {
        console.error("[Downloader] ❌ Failed to download:", error);
        return null;
    }
};