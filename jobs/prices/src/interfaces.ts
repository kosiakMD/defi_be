export interface Token {
  tokenAddress?: string;
  pairPosition?: number;
  decimals?: number;
  reserved?: string;
}

export interface Pair {
  address: string;
  type: string;
  tokens?: Token[];
}

export interface Protocol {
  address: string;
  coin: string;
  name: string;
}

export interface LambdaRequestInterface {
  rpcUrl: string;
  chainId: number;
  stableCoins: string[];
  protocol: Protocol;
  priceServiceUrl: string;
  tokenServiceUrl: string;
  currencyId: number;
}

export interface AssetsApiResponse {
  id?: number;
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  chainId: number;
  pairs?: Pair[];
}

export interface PriceResponse {
  address: string;
  price: number;
  chainId: number;
  currencyId: number;
}

export interface StableCoinMapValue {
  reserveStable: string;
  reserveCoin: string;
}
