import { BaseWithTokens } from './new.interfaces';
import { IClaimableTokenOpportunity, IClaimableTokenUserEntry } from './tokens-claimable.interface';

export type IClaimableFeatureOpportunity = BaseWithTokens<
  IClaimableTokenOpportunity[],
  void,
  void,
  void
>;
export type IClaimableFeatureUser = BaseWithTokens<IClaimableTokenUserEntry[], void, void, void>;
