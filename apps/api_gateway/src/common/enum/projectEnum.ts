import { YearnProtocolEnum } from '@app/common';

import { QuickswapProtocolEnum } from '.';

export enum ProjectEnum {
  pancake = 'pancake',
  pangolin = 'pangolin',
  spookyswap = 'spookyswap',
  sushiswap = 'sushiswap',
  uniswap = 'uniswap',
}

export enum EllipsisProtocolEnum {
  ellipsis = 'Ellipsis',
}

export enum AutofarmProtocolEnum {
  autofarm = 'Autofarm',
}

export enum AaveProtocolEnum {
  AaveV2 = 'AaveV2',
}

export enum AlpacaProtocolEnum {
  alpaca = 'Alpaca',
}

export enum PancakeProtocolEnum {
  pancakeV1 = 'PancakeV1',
  pancakeV2 = 'PancakeV2',
}

export enum PangolinProtocolEnum {
  pangolin = 'Pangolin',
}

export enum SpookySwapProtocolEnum {
  SpookySwap = 'SpookySwap',
}

export enum SushiSwapProtocolEnum {
  sushiswapV1 = 'SushiSwapV1',
  sushiswapV2 = 'SushiSwapV2',
  sushiswapV3 = 'SushiSwapV3',
}

export enum UniswapProtocolEnum {
  uniswapV1 = 'UniswapV1',
  uniswapV2 = 'UniswapV2',
  uniswapV3 = 'UniswapV3',
}

export type ProtocolName =
  | AutofarmProtocolEnum
  | PancakeProtocolEnum
  | PangolinProtocolEnum
  | QuickswapProtocolEnum
  | SpookySwapProtocolEnum
  | SushiSwapProtocolEnum
  | UniswapProtocolEnum
  | AlpacaProtocolEnum
  | AaveProtocolEnum
  | YearnProtocolEnum
  | EllipsisProtocolEnum;

export const ProtocolNameEnum = {
  ...AutofarmProtocolEnum,
  ...PancakeProtocolEnum,
  ...PangolinProtocolEnum,
  ...QuickswapProtocolEnum,
  ...SpookySwapProtocolEnum,
  ...SushiSwapProtocolEnum,
  ...UniswapProtocolEnum,
  ...AlpacaProtocolEnum,
  ...AaveProtocolEnum,
  ...YearnProtocolEnum,
  ...EllipsisProtocolEnum,
};
