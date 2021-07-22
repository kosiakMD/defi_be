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

export enum EtherScanStatusEnum {
  ok = '1',
  error = '0',
}

export enum EtherScanMessageEnum {
  ok = 'OK',
  notOk = 'NOTOK',
  noTransactionsFound = 'No transactions found',
}

export enum TransactionTypeEnum {
  normal = 'normal',
  internal = 'internal',
}
