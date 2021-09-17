import { ChainAbbrEnum, ChainIdEnum } from '@app/common/enum';

export const Chains: Record<ChainAbbrEnum, ChainIdEnum> = {
  [ChainAbbrEnum.eth]: ChainIdEnum.eth,
  [ChainAbbrEnum.bsc]: ChainIdEnum.bsc,
  [ChainAbbrEnum.plg]: ChainIdEnum.plg,
  [ChainAbbrEnum.ftm]: ChainIdEnum.ftm,
  [ChainAbbrEnum.arbi]: ChainIdEnum.arbi,
  [ChainAbbrEnum.avax]: ChainIdEnum.avax,
};
