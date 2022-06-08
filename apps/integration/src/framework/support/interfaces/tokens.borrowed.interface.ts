import { IRewardRates } from './rewards.interface';
import { ITokenMinimal, ITokenOpportunity, ITokenUserEntry } from './tokens.common.interface';

export interface IBorrowTokenMinimal<TExtra = unknown> extends ITokenMinimal<TExtra> {
  totalBorrowed: string;
  rate?: { [key: string]: string };
}

// TODO: Review if this makes sense. no current lending/borrowing protocols
export interface IBorrowTokenOpportunity<TExtra = unknown> extends ITokenOpportunity<TExtra> {
  totalBorrowed?: number;
  tvl: number;
  apy?: IRewardRates;
  apr?: IRewardRates;
}

export interface IBorrowTokenUserEntity<TExtra = unknown> extends ITokenUserEntry<TExtra> {
  tvl: number;
  apy?: IRewardRates;
  apr?: IRewardRates;
}
