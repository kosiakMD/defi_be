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

export interface ICompoundHttpCToken {
  borrow_cap: ICompoundHttpValue; // eslint-disable-line camelcase
  borrow_rate: ICompoundHttpValue; // eslint-disable-line camelcase
  cash: ICompoundHttpValue; // eslint-disable-line camelcase
  collateral_factor: ICompoundHttpValue; // eslint-disable-line camelcase
  comp_borrow_apy: ICompoundHttpValue; // eslint-disable-line camelcase
  comp_supply_apy: ICompoundHttpValue; // eslint-disable-line camelcase
  exchange_rate: ICompoundHttpValue; // eslint-disable-line camelcase
  interest_rate_model_address: Address; // eslint-disable-line camelcase
  name: string;
  number_of_borrowers: number; // eslint-disable-line camelcase
  number_of_suppliers: number; // eslint-disable-line camelcase
  reserve_factor: ICompoundHttpValue; // eslint-disable-line camelcase
  reserves: ICompoundHttpValue; // eslint-disable-line camelcase
  supply_rate: ICompoundHttpValue; // eslint-disable-line camelcase
  symbol: string;
  token_address: string; // eslint-disable-line camelcase
  total_borrows: ICompoundHttpValue; // eslint-disable-line camelcase
  total_supply: ICompoundHttpValue; // eslint-disable-line camelcase
  underlying_address: Address; // eslint-disable-line camelcase
  underlying_name: string; // eslint-disable-line camelcase
  underlying_price: ICompoundHttpValue; // eslint-disable-line camelcase
  underlying_symbol: string; // eslint-disable-line camelcase
}
