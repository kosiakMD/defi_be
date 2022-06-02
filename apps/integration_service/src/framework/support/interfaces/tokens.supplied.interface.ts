import {
  IBaseApy,
  ITokenMinimal,
  ITokenOpportunity,
  ITokenUserEntry,
} from './tokens.common.interface';

// 'Minimal' interfaces are the minimal needed web3/thegraph/api data
// i.e. usually tokens are just the token address,
// numbers are stringified BigNumbers, etc
// The matching interface (without 'Raw') will be the filled
// values (decimal value, full token details, etc)
export interface ISupplyTokenMinimal extends ITokenMinimal {
  weight?: string;
  totalSupplied?: string; // number of tokens staked (we won't have prices here)
  rate?: { [key: string]: string };
  ltv?: string;
}

export interface ISupplyTokenOpportunity extends ITokenOpportunity {
  weight?: number;
  totalSupply?: number; // number of total supply of tokens (in case of lp token)
  totalSupplied?: number; // number of tokens staked
  tvl: number;
  apy?: ISupplyApy;
  ltv?: number;
}

export interface ISupplyTokenUserEntry extends ITokenUserEntry {
  totalSupplied?: number; // number of tokens staked
  tvl: number; // number of tokens * token price
  apy?: ISupplyApy;
  ltv?: number;
  unlocked?: number;
}
interface ISupplyApy extends IBaseApy {
  supplyApy?: number;
}
