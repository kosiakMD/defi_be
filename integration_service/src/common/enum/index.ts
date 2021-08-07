import { PancakeProtocolEnum, SushiSwapProtocolEnum, UniswapProtocolEnum } from './platform.enum';

export * from './chain.enum';
export * from './platform.enum';

export enum DirectionEnum {
  in = 'in',
  out = 'out',
}

export enum CurrencyEnum {
  usd = 'usd',
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

export enum LiquidityChangeTypeEnum {
  addLiquidity = 'addLiquidity',
  removeLiquidity = 'removeLiquidity',
}

export enum EnumName {
  SwapTransactionType = 'SwapTransactionType',
  TransactionType = 'TransactionType',
  Direction = 'Direction',
  LiquidityChangeType = 'LiquidityChangeType',
}

export enum ColumnType {
  json = 'json',
  timestamp = 'timestamp',
  timestamptz = 'timestamptz',
}

export type ProtocolName = PancakeProtocolEnum | SushiSwapProtocolEnum | UniswapProtocolEnum;
