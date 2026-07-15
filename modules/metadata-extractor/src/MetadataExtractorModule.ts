import { requireNativeModule } from 'expo';

export interface MetadataResult {
  title?: string;
  artist?: string;
  artwork?: string;
  error?: string;
}

let MetadataExtractor: any = null;
try {
  MetadataExtractor = requireNativeModule('MetadataExtractor');
} catch (err) {
  console.warn('[MetadataExtractor] Native module MetadataExtractor was not found. Build the native app to link it.');
}

export default MetadataExtractor;
