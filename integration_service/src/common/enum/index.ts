export * from './chain.enum';
export * from './liquidity.enum';
export * from './projectEnum';
export * from './transaction.type';

export enum ResultStatus {
  ok = 'ok',
  error = 'error',
}

export enum HealthStatusEnum {
  ok = 'ok',
  error = 'error',
  shuttingDown = 'shutting_down',
}

export enum DirectionEnum {
  in = 'in',
  out = 'out',
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
  lending = 'lending',
  borrowing = 'borrowing',
  transaction = 'transaction',
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
