import { ChainAbbrEnum, NftProjectEnum } from '@app/common';

import { Address } from '..';
import { ChainsDto as NftChainsDto } from '../dto/nft';

export type NftAssetsByAccounts = Record<Address, NftChainsDto>;

export interface NftAssetsParams {
  projectName: NftProjectEnum;
}

export interface NftServiceInfo {
  project: NftProjectEnum;
  chains: ChainAbbrEnum[];
}
