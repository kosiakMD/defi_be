import {
  IBaseApy,
  ITokenMinimal,
  ITokenOpportunity,
  ITokenUserEntry,
} from './tokens.common.interface';

export interface IBorrowTokenMinimal extends ITokenMinimal {
  totalBorrowed: string;
  rate?: { [key: string]: string };
}

// TODO: Review if this makes sense. no current lending/borrowing protocols
export interface IBorrowTokenOpportunity extends ITokenOpportunity {
  totalBorrowed?: number;
  tvl: number;
  apy?: IBorrowApy;
}

export interface IBorrowTokenUserEntity extends ITokenUserEntry {
  tvl: number;
  apy?: IBorrowApy;
}

interface IBorrowApy extends IBaseApy {
  borrowApy?: number;
}
