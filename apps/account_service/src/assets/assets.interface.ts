export interface Token {
  tokenAddress: string;
  pairPosition: number;
  decimals: number;
  name?: string;
  reserved?: string;
}

export interface Pair {
  address: string;
  type?: string;
  totalSupply?: string;
  tokens?: Token[];
}

export interface AssetsForLambdaResponse {
  id: number;
  address: string;
  name?: string;
  symbol?: string;
  decimals: number;
  chainId: number;
  pairs?: Pair[];
}
