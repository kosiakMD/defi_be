import {
  IBaseApy,
  ITokenMinimal,
  ITokenOpportunity,
  ITokenUserEntry,
} from './tokens-common.interface';

export interface IBorrowTokenMinimal<TExtra = void> extends ITokenMinimal<TExtra> {
  totalBorrowed: string;
  rate?: { [key: string]: string };
}

// TODO: Review if this makes sense. no current lending/borrowing protocols
export interface IBorrowTokenOpportunity<TExtra = void> extends ITokenOpportunity<TExtra> {
  totalBorrowed?: number;
  tvl: number;
  apy?: IBorrowApy;
}

export interface IBorrowTokenUserEntity<TExtra = void> extends ITokenUserEntry<TExtra> {
  tvl: number;
  apy?: IBorrowApy;
}

interface IBorrowApy extends IBaseApy {
  borrowApy?: number;
}
