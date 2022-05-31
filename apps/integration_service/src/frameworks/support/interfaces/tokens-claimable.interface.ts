import { ERC20Token } from './tokens-common.interface';

export interface IClaimableTokenOpportunity {
  token: ERC20Token;
}

export interface IClaimableTokenUserEntry {
  token: ERC20Token;
  amount: number;
  value: number;
}
