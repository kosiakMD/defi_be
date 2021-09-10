import { ChainAbbrEnum, ChainIdEnum } from '../common/enum';

export const Chains: Record<ChainAbbrEnum, ChainIdEnum> = {
  [ChainAbbrEnum.eth]: ChainIdEnum.eth,
  [ChainAbbrEnum.bsc]: ChainIdEnum.bsc,
};
