import MetadataExtractor from '../../modules/metadata-extractor/src/MetadataExtractorModule';
import { Platform } from 'react-native';

export interface LocalMetadata {
  title: string;
  artist: string;
  artwork?: string;
}

/**
 * Extracts metadata (Title, Artist, Embedded Artwork) from a local media file URI.
 * Uses native MediaMetadataRetriever under the hood for fast, low-memory extraction.
 */
export const extractLocalMetadata = async (fileUri: string): Promise<LocalMetadata | null> => {
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

        resolve({
          title: result.title || '',
          artist: result.artist || '',
          artwork: result.artwork,
        });
      } catch (err) {
        console.error(`[MetadataExtractor] Exception extracting metadata for ${fileUri}:`, err);
        resolve(null);
      }
    }, 0);
  });
};
