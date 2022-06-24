import {
  SpookySwapProtocolEnum,
  PangolinProtocolEnum,
  PancakeProtocolEnum,
  AlpacaProtocolEnum,
  SushiSwapProtocolEnum,
  UniswapProtocolEnum,
  YearnProtocolEnum,
  EllipsisProtocolEnum,
  QuickswapProtocolEnum,
} from '@app/common';

export type ProtocolName =
  | PancakeProtocolEnum
  | PangolinProtocolEnum
  | QuickswapProtocolEnum
  | SpookySwapProtocolEnum
  | SushiSwapProtocolEnum
  | UniswapProtocolEnum
  | AlpacaProtocolEnum
  | YearnProtocolEnum
  | EllipsisProtocolEnum;
