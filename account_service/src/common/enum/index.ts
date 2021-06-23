import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../constatnt';

export enum ChainEnum {
  'ETH' = CHAIN_ID_ETH,
  'BSC' = CHAIN_ID_BSC,
}

export enum ChainPrefixEnum {
  'eth' = CHAIN_ID_ETH,
  'bsc' = CHAIN_ID_BSC,
}

export enum ResultStatus {
  ok = 'ok',
  error = 'error',
}
