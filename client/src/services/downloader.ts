import * as FileSystem from 'expo-file-system/legacy';
import { Track } from '@/store/usePlaybackStore';

const BACKEND_URL = 'http://192.168.43.179:5000'; // Make sure IP is correct

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
        const cleanArtist = track.artist.split('•')[0].trim();
        // The API route we created in Flask (skip quality, backend defaults to direct copy)
        const downloadUrl = `${BACKEND_URL}/api/download?id=${trackId}&format=${format}&title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(cleanArtist)}`;

        // Safe file name banayenge (special characters hata kar)
        const safeTitle = track.title.replace(/[^a-zA-Z0-9 ]/g, "").trim();
        const fileName = `${safeTitle} - ${track.artist}.${format}`;

        // App ka internal document folder jahan files permanently save hongi
        const downloadDir = FileSystem.documentDirectory + 'OmniPlayer/';

        // Check karenge ke OmniPlayer ka folder pehle se hai ya nahi, nahi toh naya banayenge
        const dirInfo = await FileSystem.getInfoAsync(downloadDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
        }

        const fileUri = downloadDir + fileName;

        console.log(`[Downloader] Starting download for: ${track.title}`);
        console.log(`[Downloader] File will be saved at: ${fileUri}`);

        // Create download resumable for tracking progress
        const downloadResumable = FileSystem.createDownloadResumable(
            downloadUrl,
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
            console.error("[Downloader] ❌ Server returned error status:", downloadRes ? downloadRes.status : 'unknown');
            return null;
        }
    } catch (error) {
        console.error("[Downloader] ❌ Failed to download:", error);
        return null;
    }
};