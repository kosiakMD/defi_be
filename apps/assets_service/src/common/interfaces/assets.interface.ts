export enum AssetState {
  pending = 'pending',
  processing = 'processing',
  ready = 'ready',
}

interface IBaseAsset {
  name?: string;
  decimals: number;
  chain: number;
  address: string;
  symbol: string;
}

export interface IAsset extends IBaseAsset {
  id: number;
  status: AssetState;
}

export interface IToken extends IBaseAsset {
  pairPosition: number;
  reserved?: string;
}

export interface Pair {
  address: string;
  totalSupply?: string;
  tokens?: IToken[];
}

export interface AssetsMetadata {
  reserve0?: number;
  reserve1?: number;
  blockTimestampLast?: number;
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

export interface AssetsForSearchResponse {
  id: number;
  address: string;
  name?: string;
  symbol?: string;
  chainId: number;
  icon?: string;
}
