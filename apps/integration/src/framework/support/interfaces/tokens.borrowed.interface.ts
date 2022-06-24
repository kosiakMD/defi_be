import { IRewardRates } from './rewards.interface';
import { ITokenMinimal, ITokenOpportunity, ITokenUserEntry } from './tokens.common.interface';

export interface IBorrowTokenMinimal<TExtra = unknown> extends ITokenMinimal<TExtra> {
  // TODO: totalBorrowed and rate should live in the integrations that require them
  totalBorrowed: string;
  rate?: { [key: string]: string };
}

export interface IBorrowTokenOpportunity<TExtra = unknown> extends ITokenOpportunity<TExtra> {
  // TODO totalBorrowed can be removed, and just TVL used
  totalBorrowed?: number;
  tvl: number;
  // TODO: can probably remove apy
  apy?: IRewardRates;
  apr?: IRewardRates;
}

export interface IBorrowTokenUserEntity<TExtra = unknown> extends ITokenUserEntry<TExtra> {
  tvl: number;
  // TODO: can probably remove apy
  apy?: IRewardRates;
  apr?: IRewardRates;
}
