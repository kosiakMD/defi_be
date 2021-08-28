import {
  PancakeProtocolEnum,
  ProjectEnum,
  ProtocolName,
  SushiSwapProtocolEnum,
  UniswapProtocolEnum,
} from '../enum';

export type PlatformsType = Record<ProjectEnum, ProtocolName>;

export type PlatformsInterface = {
  [key in keyof typeof ProjectEnum]: ProtocolName;
};

export const Platforms = {
  [ProjectEnum.sushiswap]: SushiSwapProtocolEnum,
  [ProjectEnum.uniswap]: UniswapProtocolEnum,
  [ProjectEnum.pancake]: PancakeProtocolEnum,
};
