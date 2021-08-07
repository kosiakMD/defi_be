import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../constatnt';

export enum ChainSymbolNames {
  ETH = 'ethereum',
  eth = 'ethereum',
  BSC = 'binance',
  bsc = 'binance',
}

export enum ChainSymbols {
  eth = 'eth',
  ETH = 'ETH',
  bsc = 'bsc',
  BSC = 'BSC',
}

export enum ChainEnum {
  eth = CHAIN_ID_ETH,
  ETH = CHAIN_ID_ETH,
  bsc = CHAIN_ID_BSC,
  BSC = CHAIN_ID_BSC,
}

export enum ChainPrefixEnum {
  'eth' = CHAIN_ID_ETH,
  'bsc' = CHAIN_ID_BSC,
}

export enum ChainIdEnum {
  eth = 1,
  bsc = 2,
}

export enum ProtocolTypeEnum {
  amm = 'amm',
  staking = 'staking',
  transaction = 'transaction',
}

export enum ResultStatus {
  ok = 'ok',
  error = 'error',
}

export enum EtherScanStatusEnum {
  ok = '1',
  error = '0',
}

export enum EtherScanMessageEnum {
  ok = 'OK',
  notOk = 'NOTOK',
  noTransactionsFound = 'No transactions found',
}

export enum TransactionType {
  normal = 'normal',
  internal = 'internal',
}
