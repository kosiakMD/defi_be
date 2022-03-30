import {
  ChainIdEnum,
  AaveProtocolEnum,
  AbracadabraProtocolEnum,
  AlpacaProtocolEnum,
  AutofarmProtocolEnum,
  BadgerProtocolEnum,
  BeefyProtocolEnum,
  CompoundProtocolEnum,
  ConvexProtocolEnum,
  CurveProtocolEnum,
  DefiKingdomsProtocolEnum,
  EllipsisProtocolEnum,
  IslandswapProtocolEnum,
  MojitoswapProtocolEnum,
  OlympusProtocolEnum,
  PancakeProtocolEnum,
  PangolinProtocolEnum,
  QuickswapProtocolEnum,
  RaydiumProtocolEnum,
  SaberProtocolEnum,
  SpookySwapProtocolEnum,
  SushiSwapProtocolEnum,
  TraderjoeProtocolEnum,
  UniswapProtocolEnum,
  VVSProtocolEnum,
  VenusProtocolEnum,
  ViperswapProtocolEnum,
  WePiggyProtocolEnum,
  WonderlandProtocolEnum,
  YearnProtocolEnum,
  TrisolarisProtocolEnum,
  OrcaProtocolEnum,
  SundaeProtocolEnum,
  AnchorProtocolEnum,
  TerraswapProtocolEnum,
  AstroportProtocolEnum,
  MarinadeProtocolEnum,
} from '@app/common/enum';
import { AccountBalance } from '@app/common/interfaces';

export * from './features.types';
export * from './protocol.types';

export type ChainId = ChainIdEnum;

export type ProtocolName =
  | AaveProtocolEnum
  | AbracadabraProtocolEnum
  | AlpacaProtocolEnum
  | AutofarmProtocolEnum
  | BadgerProtocolEnum
  | BeefyProtocolEnum
  | CompoundProtocolEnum
  | ConvexProtocolEnum
  | CurveProtocolEnum
  | DefiKingdomsProtocolEnum
  | EllipsisProtocolEnum
  | IslandswapProtocolEnum
  | MojitoswapProtocolEnum
  | OlympusProtocolEnum
  | PancakeProtocolEnum
  | PangolinProtocolEnum
  | QuickswapProtocolEnum
  | RaydiumProtocolEnum
  | SaberProtocolEnum
  | SpookySwapProtocolEnum
  | SushiSwapProtocolEnum
  | TraderjoeProtocolEnum
  | UniswapProtocolEnum
  | VVSProtocolEnum
  | VenusProtocolEnum
  | ViperswapProtocolEnum
  | WePiggyProtocolEnum
  | WonderlandProtocolEnum
  | YearnProtocolEnum
  | TrisolarisProtocolEnum
  | OrcaProtocolEnum
  | SundaeProtocolEnum
  | AnchorProtocolEnum
  | TerraswapProtocolEnum
  | AstroportProtocolEnum
  | MarinadeProtocolEnum;

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
