import { ERC20Token } from './tokens.common.interface';

export interface IClaimableTokenOpportunity {
  token: ERC20Token;
}

export interface IClaimableTokenUserEntry extends IClaimableTokenOpportunity {
  amount: number;
  value: number;
}
