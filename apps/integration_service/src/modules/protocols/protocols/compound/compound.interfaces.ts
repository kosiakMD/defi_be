import { Address } from '@app/common';

export interface ICompoundHttpValue {
  value: string;
}
export interface ICompoundHttpToken {
  address: Address;
  borrow_balance_underlying: ICompoundHttpValue; // eslint-disable-line camelcase
  lifetime_borrow_interest_accrued: ICompoundHttpValue; // eslint-disable-line camelcase
  lifetime_supply_interest_accrued: ICompoundHttpValue; // eslint-disable-line camelcase
  safe_withdraw_amount_underlying: ICompoundHttpValue; // eslint-disable-line camelcase
  supply_balance_underlying: ICompoundHttpValue; // eslint-disable-line camelcase
  symbol: string;
}

export interface ICompoundHttpAccount {
  address: Address;
  block_updated: null; // eslint-disable-line camelcase
  health: ICompoundHttpValue;
  tokens: ICompoundHttpToken[];
  total_borrow_value_in_eth: ICompoundHttpValue; // eslint-disable-line camelcase
  total_collateral_value_in_eth: ICompoundHttpValue; // eslint-disable-line camelcase
}

export interface ICompoundMarket {
  id: Address;
  borrowRate: string;
  supplyRate: string;
  reserves: string;
  exchangeRate: string;
  symbol: string;
  totalSupply: string;
  underlyingName: string;
  underlyingPrice: string;
  underlyingSymbol: string;
  underlyingAddress: Address;
  underlyingDecimals: number;
}
export interface ICompoundToken {
  id: string; // concatonation of ctoken-userAddress
  symbol: string;
  cTokenBalance: string; // TODO: Multicall!
  market: ICompoundMarket;
}

export interface ICompoundAccount {
  id: Address;
  health: string; // TODO: should be multicall not subgraph
  tokens: ICompoundToken[];
}

export interface ICompoundAccountResponse {
  errors?: string[];
  accounts: ICompoundAccount[];
}
