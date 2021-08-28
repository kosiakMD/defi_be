export enum ProjectEnum {
  sushiswap = 'sushiswap',
  uniswap = 'uniswap',
  pancake = 'pancake',
  curve = 'curve',
  balancer = 'balancer',
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
export type ProtocolName = PancakeProtocolEnum | SushiSwapProtocolEnum | UniswapProtocolEnum;
export const ProtocolNameEnum = {
  ...PancakeProtocolEnum,
  ...SushiSwapProtocolEnum,
  ...UniswapProtocolEnum,
};
