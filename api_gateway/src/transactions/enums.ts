import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../scans-api/modules/utils/utils';

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

export type ChainId = number;
