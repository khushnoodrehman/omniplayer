import { registerWebModule, NativeModule } from 'expo';
import { MetadataResult } from './MetadataExtractorModule';

class MetadataExtractorModule extends NativeModule {
  extractMetadata(fileUri: string): MetadataResult {
    return { error: 'Web platform is not supported' };
  }
}

export default registerWebModule(MetadataExtractorModule, 'MetadataExtractorModule');
