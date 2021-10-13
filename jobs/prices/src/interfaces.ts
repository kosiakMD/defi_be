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
  name: string;
}

export interface AssetPairData {
  coin: string;
  asset: string;
  factory: string;
  pairAddress?: string;
  protocolName?: string;
}

export interface LambdaRequestInterface {
  rpcUrl: string;
  chainId: number;
  stableCoins: string[];
  whiteListCoins: string[];
  protocol: Protocol[];
  wrappedCoin: string;
  priceServiceUrl: string;
  tokenServiceUrl: string;
  currencyId: number;
  contractAddress: string;
}

export interface AssetsApiResponse {
  id?: number;
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  chainId: number;
  pairs?: Pair[];
  pairProtocols?: Protocol[];
}

export interface PriceResponse {
  address: string;
  price: number;
  chainId: number;
  currencyId: number;
}

export interface CurrentPrice {
  [key: string]: number;
}

export interface StableCoinMapValue {
  stableAddress?: string;
  reserveStable: string;
  reserveCoin: string;
  reserveUsd: number;
}
