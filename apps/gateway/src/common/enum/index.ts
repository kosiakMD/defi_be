export enum ChainIdEnum {
  eth = 1,
  bnb = 2,
  plg = 3,
  ftm = 4,
  arbi = 5,
  avax = 6,
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
