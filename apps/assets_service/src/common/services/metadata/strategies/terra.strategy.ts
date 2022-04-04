import { MetadataStrategy } from './index';

export class TerraMetadataStrategy extends MetadataStrategy {
  getMetadata(): Promise<any> {
    return Promise.resolve(undefined);
  }
}
