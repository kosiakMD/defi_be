import { AssetProcessingRequest } from '../../types/asset-processing.request';

export interface TrackedAssetsProvider {
  name(): string;
  getTrackedAssetsCandidates(): Promise<AssetProcessingRequest[]>;
}
