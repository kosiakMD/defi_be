export * from './asset.enum';
export * from './chain.enum';
export * from './feature.enum';
export * from './protocol.enum';
export * from './nft.enum';
export * from './env.enum';
export * from './endpoints.enum';
export * from './chain.wrapped.tokens.enum';

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
  lending = 'lending',
  borrowing = 'borrowing',
  leverageFarming = 'leverageFarming',
  shortFarm = 'shortFarm',
  mint = 'mint',
  bootstrap = 'bootstrap',
  lockdrop = 'lockdrop',
  claimable = 'claimable',
  airdrop = 'airdrop',
  delegation = 'delegation',
}

export enum TransactionTypeEnum {
  stake = 'stake',
  unStake = 'unStake',
  claim = 'claim',
  swap = 'swap',
  transfer = 'transfer',
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

export enum ServiceEnum {
  Account = 'Account',
  Integration = 'Integration',
  Price = 'Price',
  Opportunities = 'Opportunities',
}
