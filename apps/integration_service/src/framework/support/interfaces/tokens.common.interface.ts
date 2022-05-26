export interface ERC20TokenMinimal {
  address: string;
}

export interface ERC20TokenWithUnderlingMinimal extends ERC20TokenMinimal {
  underlying: ERC20TokenMinimal[];
}
// TODO: This needs to match asset service interface
export interface ERC20Token extends ERC20TokenMinimal {
  // ERC20 Standard
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply?: number;

  // Extra Token Info
  price: number;
  chainId: number;

  // User Details
  value?: number;
  balance?: number;

  // LP/Wrapped/Underlying token extras
  reserve?: number;
  position?: number;
  underlying?: ERC20Token[];
}

export interface ITokenMinimal {
  token: ERC20TokenMinimal; // just address
}

export interface ITokenOpportunity {
  token: ERC20Token; // full erc20 token with price
}
export interface ITokenUserEntry {
  token: ERC20Token; // full erc20 token with price
  amount: number; // user balance
  value: number; // balance * price
}
export interface IBaseApy {
  variableApy?: number;
  stableApy?: number;
}
