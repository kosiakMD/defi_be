export enum ChainAbbrEnum {
  eth = 'eth',
  bsc = 'bsc',
  plg = 'plg',
  ftm = 'ftm',
  arbi = 'arbi',
  avax = 'avax',
  xdai = 'xdai',
  celo = 'celo',
  mriver = 'mriver',
  harm = 'harm',
  heco = 'heco',
  sol = 'sol',
  okex = 'okex',
  cro = 'cro',
  boba = 'boba',
  kcc = 'kcc',
  opt = 'opt',
  near = 'near',
  terra = 'terra',
}

export enum ChainNameEnum {
  eth = 'ethereum',
  bsc = 'binance',
  plg = 'polygon',
  ftm = 'fantom',
  arbi = 'arbitrum',
  avax = 'avalanche',
  xdai = 'xdai',
  celo = 'celo',
  mriver = 'moonriver',
  harm = 'harmony',
  heco = 'heco',
  sol = 'solana',
  okex = 'okex',
  cro = 'cronos',
  boba = 'boba',
  kcc = 'kucoin',
  opt = 'optimism',
  near = 'aurora',
  terra = 'terra',
}

export enum ChainIdEnum {
  eth = 1,
  bsc = 2,
  plg = 3,
  ftm = 4,
  arbi = 5,
  avax = 6,
  xdai = 7,
  celo = 8,
  mriver = 9,
  harm = 10,
  heco = 11,
  sol = 12,
  okex = 13,
  cro = 14,
  boba = 15,
  kcc = 16,
  opt = 17,
  near = 18,
  terra = 19,
}

// https://api.coingecko.com/api/v3/asset_platforms
export enum CoingeckoPlatformEnum {
  eth = 'ethereum',
  bsc = 'binance-smart-chain',
  plg = 'polygon-pos',
  ftm = 'fantom',
  arbi = 'arbitrum-one',
  avax = 'avalanche',
  xdai = 'xdai',
  celo = 'celo',
  mriver = 'moonriver',
  harm = 'harmony-shard-0',
  heco = 'huobi-token',
  sol = 'solana',
  okex = 'okex-chain',
  cro = 'cronos',
  boba = 'boba',
  kcc = 'kucoin-community-chain',
  opt = 'optimistic-ethereum',
  near = 'near-protocol',
  terra = 'terra',
}

export enum AbsoluteChainIdEnum {
  eth = 1,
  bsc = 56,
  plg = 137,
  ftm = 250,
  arbi = 42161,
  avax = 43114,
  xdai = 100,
  celo = 42220,
  mriver = 1285,
  harm = 1666600000,
  heco = 128,
  sol = 101,
  okex = 66,
  cro = 25,
  boba = 288,
  kcc = 321,
  opt = 10,
  near = 1313161554,
  terra = 'columbus-5',
}

export enum CurrencyEnum {
  usd = 'usd',
}

export enum CurrencyIdEnum {
  usd = 1,
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

export enum ChainSymbols {
  eth = 'eth',
  ETH = 'ETH',
  bsc = 'bsc',
  BSC = 'BSC',
}
