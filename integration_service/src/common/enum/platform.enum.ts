export enum PlatformEnum {
  sushiswap = 'sushiswap',
  uniswap = 'uniswap',
  pancake = 'pancake',
  curve = 'curve',
  balancer = 'balancer',
}

export enum PancakeProtocolEnum {
  protocolV1 = 'Pancake V1',
  protocolV2 = 'Pancake V2',
}

export enum SushiSwapProtocolEnum {
  protocolV1 = 'SushiSwap V1',
  protocolV2 = 'SushiSwap V2',
  protocolV3 = 'SushiSwap V3',
}

export enum UniswapProtocolEnum {
  protocolV1 = 'Uniswap V1',
  protocolV2 = 'Uniswap V2',
  protocolV3 = 'Uniswap V3',
}

export type ProtocolName = PancakeProtocolEnum | SushiSwapProtocolEnum | UniswapProtocolEnum;
