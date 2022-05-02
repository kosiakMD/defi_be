export interface ERC20TokenMinimal {
  address: string;
}

// TODO: This needs to match asset service interface
export interface ERC20Token {
  address: string;
  symbol?: string;
  name?: string;
  decimals: number;
  price?: number;
  value?: number;
  // TODO: Need more documentation on these fields
  balance?: number;
  reserve?: number;
  // TODO: Total supply?
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
