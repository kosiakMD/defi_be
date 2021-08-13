import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../../scans-api/modules/utils/utils';

export enum ChainIdEnum {
  eth = 1,
  bsc = 2,
}

export enum ChainNameEnum {
  eth = 'ethereum',
  bsc = 'binance',
}

export enum ChainPrefixEnum {
  eth = 'eth',
  bsc = 'bsc',
}

export enum PlatformEnum {
  sushiswap = 'sushiswap',
  uniswap = 'uniswap',
  pancake = 'pancake',
  curve = 'curve',
  balancer = 'balancer',
}

export enum UniswapProtocolEnum {
  protocolV1 = 'Uniswap V1',
  protocolV2 = 'Uniswap V2',
}

export enum SushiSwapProtocolEnum {
  protocolV1 = 'SushiSwap V1',
  protocolV2 = 'SushiSwap V2',
  protocolV3 = 'SushiSwap V3',
}

export enum PancakeProtocolEnum {
  protocolV1 = 'Pancake V1',
  protocolV2 = 'Pancake V2',
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
  BSC = 'binance',
  bsc = 'binance',
}

export enum ChainSymbols {
  eth = 'eth',
  ETH = 'ETH',
  bsc = 'bsc',
  BSC = 'BSC',
}

export enum TokenOperations {
  RECEIVE = 'receive',
  SEND = 'send',
  EXCHANGE = 'exchange',
}

export enum ChainEnum {
  eth = CHAIN_ID_ETH,
  ETH = CHAIN_ID_ETH,
  bsc = CHAIN_ID_BSC,
  BSC = CHAIN_ID_BSC,
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
