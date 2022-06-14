import { AssembledAssetInterface } from '@sdk/assets/interfaces';

export interface ERC20TokenMinimal {
  address: string;
}

export interface ERC20TokenWithUnderlingMinimal extends ERC20TokenMinimal {
  underlying: ERC20TokenMinimal[];
}

// TODO: balance/value should only be on user types
// TODO: rename balance => amount to match base token
type EnhancedAssembledAssetInterface = AssembledAssetInterface & {
  balance?: number;
  value?: number;
};
// TODO: This needs to match asset service interface
export interface ERC20Token extends EnhancedAssembledAssetInterface {
  underlying: EnhancedAssembledAssetInterface[];
}

export interface ITokenMinimal<TExtra = unknown> {
  token: ERC20TokenMinimal; // just address
  extra?: TExtra;
}

export interface ITokenOpportunity<TExtra = unknown> extends ITokenMinimal<TExtra> {
  token: ERC20Token; // full erc20 token with price
}
export interface ITokenUserEntry<TExtra = unknown> extends ITokenOpportunity<TExtra> {
  amount: number; // user balance
  value: number; // balance * price
}
