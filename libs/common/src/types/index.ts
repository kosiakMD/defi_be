import {
  ChainIdEnum,
  AaveProtocolEnum,
  AlpacaProtocolEnum,
  AutofarmProtocolEnum,
  BeefyProtocolEnum,
  CompoundProtocolEnum,
  CurveProtocolEnum,
  ConvexProtocolEnum,
  EllipsisProtocolEnum,
  IslandswapProtocolEnum,
  PancakeProtocolEnum,
  PangolinProtocolEnum,
  QuickswapProtocolEnum,
  RaydiumProtocolEnum,
  SpookySwapProtocolEnum,
  SushiSwapProtocolEnum,
  TraderjoeProtocolEnum,
  UniswapProtocolEnum,
  ViperswapProtocolEnum,
  YearnProtocolEnum,
  BadgerProtocolEnum,
  DefiKingdomsProtocolEnum,
  VenusProtocolEnum,
  VVSProtocolEnum,
  MojitoswapProtocolEnum,
  WePiggyProtocolEnum,
  SaberProtocolEnum,
} from '@app/common/enum';
import { AccountBalance } from '@app/common/interfaces';

export * from './features.types';
export * from './protocol.types';

export type ChainId = ChainIdEnum;

export type ProtocolName =
  | AaveProtocolEnum
  | AlpacaProtocolEnum
  | AutofarmProtocolEnum
  | BeefyProtocolEnum
  | CompoundProtocolEnum
  | CurveProtocolEnum
  | ConvexProtocolEnum
  | EllipsisProtocolEnum
  | IslandswapProtocolEnum
  | PancakeProtocolEnum
  | PangolinProtocolEnum
  | QuickswapProtocolEnum
  | RaydiumProtocolEnum
  | SpookySwapProtocolEnum
  | SushiSwapProtocolEnum
  | TraderjoeProtocolEnum
  | UniswapProtocolEnum
  | ViperswapProtocolEnum
  | YearnProtocolEnum
  | BadgerProtocolEnum
  | DefiKingdomsProtocolEnum
  | VenusProtocolEnum
  | VVSProtocolEnum
  | MojitoswapProtocolEnum
  | WePiggyProtocolEnum
  | SaberProtocolEnum;

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
