import {
  AaveProtocolEnum,
  AlpacaProtocolEnum,
  AutofarmProtocolEnum,
  ChainIdEnum,
  PancakeProtocolEnum,
  PangolinProtocolEnum,
  PumpkinsProtocolEnum,
  QuickswapProtocolEnum,
  SpookySwapProtocolEnum,
  SushiSwapProtocolEnum,
  UniswapProtocolEnum,
  YearnProtocolEnum,
  TraderjoeProtocolEnum,
  CurveProtocolEnum,
  EllipsisProtocolEnum,
  RaydiumProtocolEnum,
} from '@app/common/enum';
import { AccountBalance } from '@app/common/interfaces';

export * from './features.types';
export * from './protocol.types';

export type ChainId = ChainIdEnum;

export type ProtocolName =
  | CurveProtocolEnum
  | AaveProtocolEnum
  | AlpacaProtocolEnum
  | AutofarmProtocolEnum
  | PancakeProtocolEnum
  | PangolinProtocolEnum
  | QuickswapProtocolEnum
  | SpookySwapProtocolEnum
  | SushiSwapProtocolEnum
  | UniswapProtocolEnum
  | YearnProtocolEnum
  | TraderjoeProtocolEnum
  | EllipsisProtocolEnum
  | RaydiumProtocolEnum
  | PumpkinsProtocolEnum;

export enum ColumnType {
  json = 'json',
  timestamp = 'timestamp',
  timestamptz = 'timestamptz',
}

export type Address = string;

export type Balance = string;

export type TokenSymbol = string;

export type DateString = string;

export type Chain = ChainIdEnum;

export type Chains = ChainIdEnum[];

export type BalancesResponse = { [key: string]: AccountBalance };

export type TokenPrices = { [key: string]: number };

export type Timestamp = string;

export type CurrencyId = number;
