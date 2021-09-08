export enum ChainNameEnum {
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

export enum ChainPrefixEnum {
  eth = 'eth',
  bsc = 'bsc',
  polygon = 'polygon',
  ftm = 'ftm',
  arbi = 'arbi',
}

export enum ChainIdEnum {
  eth = 1,
  bsc = 2,
  polygon = 3,
  ftm = 4,
  arbitrum = 5,
}

export enum AbsoluteChainIdEnum {
  eth = 1,
  bsc = 56,
  polygon = 137,
  ftm = 250,
  arbitrum = 42161,
}

export enum CurrencyEnum {
  usd = 'usd',
}

export enum CurrencyIdEnum {
  usd = 1,
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
