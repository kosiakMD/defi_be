import { ChainAbbrEnum, NftProjectEnum, ChainIdEnum, Address } from '@app/common';

import { ChainsDto, CollectionChainsDto } from '../dto/nft';

export type NftAssetsByAccounts = Record<Address, ChainsDto>;
export type NftCollectionsByAccounts = Record<Address, CollectionChainsDto>;

export interface NftAssetsParams {
  projectName: NftProjectEnum;
}

export interface NftServiceInfo {
  project: NftProjectEnum;
  chains: ChainAbbrEnum[];
  chainsIds: ChainIdEnum[];
}
