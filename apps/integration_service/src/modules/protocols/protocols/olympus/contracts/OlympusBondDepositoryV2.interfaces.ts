import { Address } from '@app/common';

export interface INote {
  payout: string; // number /1e18
  created: number; // date * 1000
  matured: number; // date * 1000
  redeemed: number; // date * 1000 (or 0 for unredeemed)
  marketID: number; // call markets(marketID) for more info
}

// examples for markets(20)
export interface IMarket {
  capacity: string; // 14544148522479442813099133
  quoteToken: Address; // 0x6B175474E89094C44Da98b954EedeAC495271d0F
  capacityInQuote: boolean;
  totalDebt: string; // 205330853894982
  maxPayout: string; // 2879828539001
  sold: string; // 6955834853771
  purchased: string; // 497518477520557186900867
}

export type IIndexesFor = number[];
