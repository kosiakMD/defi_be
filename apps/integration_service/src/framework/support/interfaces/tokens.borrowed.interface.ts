import { ITokenMinimal, ITokenOpportunity, ITokenUserEntry } from './tokens.common.interface';

export interface IBorrowTokenMinimal extends ITokenMinimal {
  totalBorrowed: string;
  rate?: { [key: string]: string };
}

// TODO: Review if this makes sense. no current lending/borrowing protocols
export interface IBorrowTokenOpportunity extends ITokenOpportunity {
  tvl: number;
  apy?: { [key: string]: number };
}

export interface IBorrowTokenUserEntity extends ITokenUserEntry {
  tvl: number;
  apy?: { [key: string]: number };
}
