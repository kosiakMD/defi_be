import {
  IBaseApy,
  ITokenMinimal,
  ITokenOpportunity,
  ITokenUserEntry,
} from './tokens.common.interface';

export interface IBorrowTokenMinimal<TExtra = unknown> extends ITokenMinimal<TExtra> {
  totalBorrowed: string;
  rate?: { [key: string]: string };
}

// TODO: Review if this makes sense. no current lending/borrowing protocols
export interface IBorrowTokenOpportunity<TExtra = unknown> extends ITokenOpportunity<TExtra> {
  totalBorrowed?: number;
  tvl: number;
  apy?: IBorrowApy;
}

export interface IBorrowTokenUserEntity<TExtra = unknown> extends ITokenUserEntry<TExtra> {
  tvl: number;
  apy?: IBorrowApy;
}

interface IBorrowApy extends IBaseApy {
  borrowApy?: number;
}
