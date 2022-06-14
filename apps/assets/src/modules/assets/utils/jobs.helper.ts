import { AssetReference } from '../../../common/types';

export function getAssetProcessJobId({ chainId, address }: AssetReference) {
  return `process-asset:${chainId}-${address}`;
}
