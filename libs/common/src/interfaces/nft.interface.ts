import { ChainAbbrEnum, NftProjectEnum } from '@app/common';

import { Address } from '..';
import { NftChainDto } from '../dto/nft';

export type NftAssetsByAccounts = Record<Address, NftChainDto[]>;

export interface NftAssetsParams {
  projectName: NftProjectEnum;
}

export interface NftServiceInfo {
  project: NftProjectEnum;
  chains: ChainAbbrEnum[];
}
