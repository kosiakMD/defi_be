import { AssetMetadata } from './asset-metadata.type';

export type AssetProcessingRequest = {
  chainId: number;
  address: string;
  isTracked?: boolean;
  metadata?: AssetMetadata;
  forceUpdate?: boolean;
};
