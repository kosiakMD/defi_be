export enum ProjectEnum {
  aave = 'aave',
  spookyswap = 'spookyswap',
  sushiswap = 'sushiswap',
  uniswap = 'uniswap',
  pancake = 'pancake',
  quickswap = 'quickswap',
  curve = 'curve',
  balancer = 'balancer',
  autofarm = 'autofarm',
  pangolin = 'pangolin',
  alpaca = 'alpaca',
}

export enum PangolinProtocolEnum {
  pangolin = 'Pangolin',
}

export enum AaveProtocolEnum {
  AaveV2 = 'AaveV2',
}

export enum SpookySwapProtocolEnum {
  SpookySwap = 'SpookySwap',
}

export enum PancakeProtocolEnum {
  pancakeV1 = 'PancakeV1',
  pancakeV2 = 'PancakeV2',
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

export enum QuickswapProtocolEnum {
  quickswap = 'QuickSwap',
}

export enum AutofarmProtocolEnum {
  autofarm = 'Autofarm',
}

export enum AlpacaProtocolEnum {
  alpaca = 'Alpaca',
}

/** TODO: try this fo swagger
 * const BasicEvents = {
  Start: 'Start' as 'Start',
  Finish: 'Finish' as 'Finish'
};
 type BasicEvents = (typeof BasicEvents)[keyof typeof BasicEvents];

 const AdvEvents = {
  ...BasicEvents,
  Pause: 'Pause' as 'Pause',
  Resume: 'Resume' as 'Resume'
};
 type AdvEvents = (typeof AdvEvents)[keyof typeof AdvEvents];
 */
export type ProtocolName =
  | AaveProtocolEnum
  | PancakeProtocolEnum
  | PangolinProtocolEnum
  | SushiSwapProtocolEnum
  | UniswapProtocolEnum
  | QuickswapProtocolEnum
  | SpookySwapProtocolEnum
  | AutofarmProtocolEnum
  | AlpacaProtocolEnum;

export const ProtocolNameEnum = {
  ...AaveProtocolEnum,
  ...PancakeProtocolEnum,
  ...PangolinProtocolEnum,
  ...SushiSwapProtocolEnum,
  ...UniswapProtocolEnum,
  ...QuickswapProtocolEnum,
  ...SpookySwapProtocolEnum,
  ...AutofarmProtocolEnum,
  ...AlpacaProtocolEnum,
};
