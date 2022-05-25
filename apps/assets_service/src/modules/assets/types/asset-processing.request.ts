import { AssetMetadata } from './asset-metadata.type';

export type AssetProcessingRequest = {
  chainId: number;
  address: string;
  rank?: number;
  isTracked?: boolean;
  metadata?: AssetMetadata;
};
