import { ITokenMinimal, ITokenOpportunity, ITokenUserEntry } from './tokens.common.interface';

// 'Minimal' interfaces are the minimal needed web3/thegraph/api data
// i.e. usually tokens are just the token address,
// numbers are stringified BigNumbers, etc
// The matching interface (without 'Raw') will be the filled
// values (decimal value, full token details, etc)
export interface ISupplyTokenMinimal extends ITokenMinimal {
  totalSupply?: string; // number of tokens staked (we won't have prices here)
  totalSupplied: string; // number of tokens staked (we won't have prices here)
}

export interface ISupplyTokenOpportunity extends ITokenOpportunity {
  totalSupply?: number; // number of tokens staked
  totalSupplied: number; // number of tokens staked
  tvl: number;
}

export interface ISupplyTokenUserEntry extends ITokenUserEntry {
  totalSupply: number; // number of tokens staked
  totalSupplied: number; // number of tokens staked
  tvl: number; // number of tokens * token price
}
