/**
 * @description Concatenation of the policyId and hex-encoded assetName
 */
export type Subject = string;
export type TokensMetadataMap = Map<Subject, IWingRidersPoolMetadata>;

export interface IToken {
  policyId: string;
  assetName: string;
  quantity: string;
}

interface IMarketData {
  volumeA24h: string;
  volumeA7d: string;

  volumeB24h: string;
  volumeB7d: string;

  feeA24h: string;
  feeB24h: string;
}

export interface IWingRidersPool {
  id: number;
  address: string;
  txHash: string;
  outputIndex: number;
  datum: string;
  datumHash: string;
  coins: string;
  tokenBundle: IToken[];
  marketData: IMarketData;
}

interface ISignature {
  publicKey: string;
  signature: string;
}

export interface IPoolField<T = string> {
  signatures: ISignature[];
  sequenceNumber: number;
  value: T;
}

export interface IWingRidersPoolMetadata {
  subject: Subject;
  name: IPoolField;
  description: IPoolField;
  logo: IPoolField;
  ticker: IPoolField;
  decimals?: IPoolField<number>;
}

export interface IWingRidersPoolMetadataResponse {
  Right: IWingRidersPoolMetadata[];
}
