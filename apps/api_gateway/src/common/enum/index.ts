export enum ChainIdEnum {
  eth = 1,
  bnb = 2,
  plg = 3,
  ftm = 4,
  arbi = 5,
  avax = 6,
}

export enum ChainPrefixEnum {
  eth = 'eth',
  bnb = 'bnb',
  plg = 'plg',
  ftm = 'ftm',
  arbi = 'arbi',
  avax = 'avax',
}

export enum AbsoluteChainIdEnum {
  eth = 1,
  bnb = 56,
  plg = 137,
  ftm = 250,
  arbi = 42161,
  avax = 43114,
}

export enum ChainNameEnum {
  ETH = 'ethereum', // remove from enum
  eth = 'ethereum',
  BNB = 'binance', // remove from enum
  bnb = 'binance',
  plg = 'polygon',
  ftm = 'fantom',
  arbi = 'arbitrum',
  avax = 'avalanche',
}

export enum ChainAbbrEnum {
  eth = 'eth',
  bnb = 'bnb',
  plg = 'plg',
  ftm = 'ftm',
  arbi = 'arbi',
  avax = 'avax',
}

export enum ProjectEnum {
  sushiswap = 'sushiswap',
  uniswap = 'uniswap',
  pancake = 'pancake',
}

export enum UniswapProtocolEnum {
  protocolV1 = 'UniswapV1',
  uniswapV1 = 'UniswapV1',
  protocolV2 = 'UniswapV2',
  uniswapV2 = 'UniswapV2',
}

export enum SushiSwapProtocolEnum {
  protocolV1 = 'SushiSwapV1',
  sushiswapV1 = 'SushiSwapV1',
  protocolV2 = 'SushiSwapV2',
  sushiswapV2 = 'SushiSwapV2',
  protocolV3 = 'SushiSwapV3',
  sushiswapV3 = 'SushiSwapV3',
}

export enum PancakeProtocolEnum {
  protocolV1 = 'PancakeV1',
  pancakeV1 = 'PancakeV1',
  protocolV2 = 'PancakeV2',
  pancakeV2 = 'PancakeV2',
}

export enum QuickswapProtocolEnum {
  quickswap = 'QuickSwap',
}

export enum ResultStatus {
  ok = 'ok',
  error = 'error',
}

export enum HealthStatusEnum {
  ok = 'ok',
  error = 'error',
  shuttingDown = 'shutting_down',
}

export enum HealthServiceStatusEnum {
  up = 'up',
  down = 'down',
}

export enum LiquidityChangeTypeEnum {
  addLiquidity = 'addLiquidity',
  removeLiquidity = 'removeLiquidity',
}

export enum ProtocolTypeEnum {
  amm = 'amm',
  staking = 'staking',
  transaction = 'transaction',
}

export enum TransactionTypeEnum {
  stake = 'stake',
  unStake = 'unStake',
  claim = 'claim',
  swap = 'swap',
  transfer = 'transfer',
}

export enum ChainSymbolNames {
  ETH = 'ethereum',
  eth = 'ethereum',
  BNB = 'binance',
  bnb = 'binance',
}

export enum ChainSymbols {
  eth = 'eth',
  ETH = 'ETH',
  bnb = 'bsc',
  BNB = 'BSC',
}

export enum TokenOperations {
  RECEIVE = 'receive',
  SEND = 'send',
  EXCHANGE = 'exchange',
}

export enum SubTransactionTypEnum {
  incoming = 'incoming',
  outgoing = 'outgoing',
}

export enum CurrencyEnum {
  usd = 'usd',
}

export enum CurrencyIdEnum {
  usd = 1,
}

export enum SortDirectionEnum {
  asc = 'asc',
  desc = 'desc',
}

export enum SortFieldEnum {
  project = 'project',
  ticker = 'ticker',
}

export enum DirectionEnum {
  in = 'in',
  out = 'out',
}
