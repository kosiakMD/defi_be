import { QuickswapProtocolEnum } from '.';

export enum ProjectEnum {
  sushiswap = 'sushiswap',
  uniswap = 'uniswap',
  pancake = 'pancake',
  spookyswap = 'spookyswap',
}

export enum PancakeProtocolEnum {
  pancakeV1 = 'PancakeV1',
  pancakeV2 = 'PancakeV2',
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

export enum AutofarmProtocolEnum {
  autofarm = 'Autofarm',
}

export type ProtocolName =
  | PancakeProtocolEnum
  | SushiSwapProtocolEnum
  | AutofarmProtocolEnum
  | SpookySwapProtocolEnum
  | QuickswapProtocolEnum
  | UniswapProtocolEnum;

export const ProtocolNameEnum = {
  ...PancakeProtocolEnum,
  ...SushiSwapProtocolEnum,
  ...UniswapProtocolEnum,
  ...AutofarmProtocolEnum,
  ...QuickswapProtocolEnum,
  ...SpookySwapProtocolEnum,
};
