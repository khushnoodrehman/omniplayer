import { useState, useEffect } from 'react';
import * as MediaLibrary from 'expo-media-library/legacy';

export const useLocalAudio = () => {
    const [audioFiles, setAudioFiles] = useState<MediaLibrary.Asset[]>([]);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [loading, setLoading] = useState(true);

    const fetchAudioFiles = async () => {
        try {
            setLoading(true);
            // Sirf audio files fetch karne ke liye filter
            const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 100, // Pehle 100 gaane fetch karega, baad mein pagination add kar sakte hain
                sortBy: [[MediaLibrary.SortBy.default, false]],
            });
            setAudioFiles(media.assets);
        } catch (error) {
            console.error("Error fetching audio:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (permissionResponse?.status === 'granted') {
            fetchAudioFiles();
        }
    }, [permissionResponse]);

    return {
        audioFiles,
        permissionResponse,
        requestPermission,
        loading,
        refreshFiles: fetchAudioFiles // Agar user manually refresh karna chahe
    };
};