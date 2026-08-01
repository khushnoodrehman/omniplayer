import MetadataExtractor from '../../modules/metadata-extractor/src/MetadataExtractorModule';
import { Platform } from 'react-native';

export interface LocalMetadata {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
}

export const globalLocalMetadataCache = new Map<string, LocalMetadata>();

export const extractLocalMetadata = async (fileUri: string): Promise<LocalMetadata | null> => {
  if (globalLocalMetadataCache.has(fileUri)) {
    return globalLocalMetadataCache.get(fileUri)!;
  }
  return new Promise((resolve) => {
    // Offload to next tick/macro-task to keep JS UI thread responsive
    setTimeout(() => {
      if (Platform.OS !== 'android' || !MetadataExtractor) {
        resolve(null);
        return;
      }

      try {
        const result = MetadataExtractor.extractMetadata(fileUri);
        if (result.error) {
          console.warn(`[MetadataExtractor] Native error for ${fileUri}: ${result.error}`);
          resolve(null);
          return;
        }

        const data: LocalMetadata = {
          title: result.title || '',
          artist: result.artist || '',
          album: result.album || '',
          artwork: result.artwork,
        };
        globalLocalMetadataCache.set(fileUri, data);
        resolve(data);
      } catch (err) {
        console.error(`[MetadataExtractor] Exception extracting metadata for ${fileUri}:`, err);
        resolve(null);
      }
    }, 0);
  });
};
