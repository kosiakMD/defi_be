import { MetadataStrategy } from './index';

export class CardanoMetadataStrategy extends MetadataStrategy {
  getMetadata(): Promise<any> {
    return Promise.resolve(undefined);
  }
}
