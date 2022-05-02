import { FeatureEnum } from '@app/common';

import { IPartialBaseFeature } from './feature.common.interface';
import { ERC20Token } from './tokens.common.interface';

// TODO: This is copy of LP feature as previous doesn't look correct
export interface IPoolFeatureEntryMinimal<TMeta = any> extends IPartialBaseFeature {
  feature: FeatureEnum.pools;
  token: ERC20Token; // NFT Token could be here as well for UniSwap V3
  meta: TMeta;
}

export interface IPoolFeatureEntryOpportunity extends IPartialBaseFeature {
  feature: FeatureEnum.pools;
  token: ERC20Token;
  tvl?: number;
}

export interface IPoolFeatureEntryUserEntry extends IPartialBaseFeature {
  feature: FeatureEnum.pools;
  token: ERC20Token;
  balance: string;
  value: number;
  tvl?: number;
}
