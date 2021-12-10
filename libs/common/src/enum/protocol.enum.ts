export enum ProjectEnum {
  aave = 'aave',
  autofarm = 'autofarm',
  balancer = 'balancer',
  curve = 'curve',
  pancake = 'pancake',
  pangolin = 'pangolin',
  pumpkins = 'pumpkins',
  quickswap = 'quickswap',
  spookyswap = 'spookyswap',
  sushiswap = 'sushiswap',
  uniswap = 'uniswap',
  alpaca = 'alpaca',
  yearn = 'yearn',
  traderjoe = 'traderjoe',
  ellipsis = 'ellipsis',
  raydium = 'raydium',
}

export enum YearnProtocolEnum {
  YearnV1 = 'YearnV1',
  YearnV2 = 'YearnV2',
}

export enum AaveProtocolEnum {
  AaveV2 = 'AaveV2',
}

export enum UniswapProtocolEnum {
  uniswapV1 = 'UniswapV1',
  uniswapV2 = 'UniswapV2',
  uniswapV3 = 'UniswapV3',
}

export enum SushiSwapProtocolEnum {
  sushiswapV1 = 'SushiSwapV1',
  sushiswapV2 = 'SushiSwapV2',
  sushiswapV3 = 'SushiSwapV3',
}

export enum PancakeProtocolEnum {
  pancakeV1 = 'PancakeV1',
  pancakeV2 = 'PancakeV2',
}

export enum AutofarmProtocolEnum {
  autofarm = 'Autofarm',
}

export enum PangolinProtocolEnum {
  pangolin = 'Pangolin',
}

export enum SpookySwapProtocolEnum {
  SpookySwap = 'SpookySwap',
}

export enum QuickswapProtocolEnum {
  quickswap = 'QuickSwap',
}

export enum AlpacaProtocolEnum {
  alpaca = 'Alpaca',
}

export enum CurveProtocolEnum {
  curve = 'Curve',
}

export enum TraderjoeProtocolEnum {
  traderjoe = 'TraderJoe',
}

export enum EllipsisProtocolEnum {
  ellipsis = 'Ellipsis',
}

export enum RaydiumProtocolEnum {
  raydium = 'Raydium',
}

export enum PumpkinsProtocolEnum {
  pumpkins = 'Pumpkins',
}

export const ProtocolNameEnum = {
  ...AaveProtocolEnum,
  ...AlpacaProtocolEnum,
  ...AutofarmProtocolEnum,
  ...CurveProtocolEnum,
  ...PancakeProtocolEnum,
  ...PangolinProtocolEnum,
  ...QuickswapProtocolEnum,
  ...SpookySwapProtocolEnum,
  ...SushiSwapProtocolEnum,
  ...UniswapProtocolEnum,
  ...YearnProtocolEnum,
  ...TraderjoeProtocolEnum,
  ...EllipsisProtocolEnum,
  ...RaydiumProtocolEnum,
  ...PumpkinsProtocolEnum,
};
