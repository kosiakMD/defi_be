import { AbsoluteChainIdEnum, ChainIdEnum } from '@app/common/enum';
import { ChainId } from '@app/common/types';

export const AbsoluteChainIds: Record<ChainIdEnum, AbsoluteChainIdEnum> = {
  [ChainIdEnum.arbitrum]: AbsoluteChainIdEnum.arbitrum,
  [ChainIdEnum.avax]: AbsoluteChainIdEnum.avax,
  [ChainIdEnum.bsc]: AbsoluteChainIdEnum.bsc,
  [ChainIdEnum.eth]: AbsoluteChainIdEnum.eth,
  [ChainIdEnum.ftm]: AbsoluteChainIdEnum.ftm,
  [ChainIdEnum.polygon]: AbsoluteChainIdEnum.polygon,
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
  [AbsoluteChainIdEnum.arbitrum]: ChainIdEnum.arbitrum,
  [AbsoluteChainIdEnum.avax]: ChainIdEnum.avax,
  [AbsoluteChainIdEnum.bsc]: ChainIdEnum.bsc,
  [AbsoluteChainIdEnum.eth]: ChainIdEnum.eth,
  [AbsoluteChainIdEnum.ftm]: ChainIdEnum.ftm,
  [AbsoluteChainIdEnum.polygon]: ChainIdEnum.polygon,
};

export const getInternalChainId = (chainId: ChainId): ChainId => InternalChainIds[chainId];
