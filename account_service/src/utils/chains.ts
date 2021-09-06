import { AbsoluteChainIdEnum, ChainIdEnum } from 'src/common/enum';
import { ChainId } from 'src/common/types';

export const AbsoluteChainIds: Record<ChainIdEnum, AbsoluteChainIdEnum> = {
  [ChainIdEnum.eth]: AbsoluteChainIdEnum.eth,
  [ChainIdEnum.bsc]: AbsoluteChainIdEnum.bsc,
  [ChainIdEnum.polygon]: AbsoluteChainIdEnum.polygon,
  [ChainIdEnum.ftm]: AbsoluteChainIdEnum.ftm,
  [ChainIdEnum.arbitrum]: AbsoluteChainIdEnum.arbitrum,
};

export const getAbsoluteChainId = (chainId: ChainId): AbsoluteChainIdEnum =>
  AbsoluteChainIds[chainId];

export const getAbsoluteChainIds = (chainIds: ChainId[] | Iterable<number>): ChainId[] => {
  const mapping = (obj): ChainId[] => obj.map(getAbsoluteChainId);
  if (Array.isArray(chainIds)) {
    return mapping(chainIds);
  } else if (typeof chainIds[Symbol.iterator] === 'function') {
    return mapping(Array.from(chainIds));
  }
};

export const InternalChainIds: Record<AbsoluteChainIdEnum, ChainIdEnum> = {
  [AbsoluteChainIdEnum.eth]: ChainIdEnum.eth,
  [AbsoluteChainIdEnum.bsc]: ChainIdEnum.bsc,
  [AbsoluteChainIdEnum.polygon]: ChainIdEnum.polygon,
  [AbsoluteChainIdEnum.ftm]: ChainIdEnum.ftm,
  [AbsoluteChainIdEnum.arbitrum]: ChainIdEnum.arbitrum,
};

export const getInternalChainId = (chainId: ChainId): ChainId => InternalChainIds[chainId];
