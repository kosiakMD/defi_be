import { MetadataStrategy } from './index';

export class SolanaMetadataStrategy extends MetadataStrategy {
  getMetadata(): Promise<any> {
    return Promise.resolve(undefined);
  }
}
