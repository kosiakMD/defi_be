import {
  SpookySwapProtocolEnum,
  PangolinProtocolEnum,
  PancakeProtocolEnum,
  AlpacaProtocolEnum,
  SushiSwapProtocolEnum,
  UniswapProtocolEnum,
  YearnProtocolEnum,
  EllipsisProtocolEnum,
  AutofarmProtocolEnum,
  QuickswapProtocolEnum,
} from '@app/common';

export type ProtocolName =
  | AutofarmProtocolEnum
  | PancakeProtocolEnum
  | PangolinProtocolEnum
  | QuickswapProtocolEnum
  | SpookySwapProtocolEnum
  | SushiSwapProtocolEnum
  | UniswapProtocolEnum
  | AlpacaProtocolEnum
  | YearnProtocolEnum
  | EllipsisProtocolEnum;
