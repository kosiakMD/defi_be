import { FeatureEnum } from '@app/common';

import { IPartialBaseFeature } from './feature.common.interface';
import { IClaimableTokenOpportunity, IClaimableTokenUserEntry } from './tokens.claimable.interface';

export interface IClaimableFeatureGeneric<TClaimable> extends IPartialBaseFeature {
  feature: FeatureEnum.claimable;
  supplied: TClaimable[];
}

export type IClaimableFeatureOpportunity = IClaimableFeatureGeneric<IClaimableTokenOpportunity>;
export type IClaimableFeatureUser = IClaimableFeatureGeneric<IClaimableTokenUserEntry>;
