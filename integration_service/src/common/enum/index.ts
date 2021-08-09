export * from './transaction.type';
export * from './liquidity.change.type';
export * from './chain.enum';
export * from './platform.enum';

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
