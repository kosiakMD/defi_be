import { AbsoluteChainIdEnum, ChainAbbrEnum, ChainIdEnum } from '@app/common/enum';
import { ChainId } from '@app/common/types';

export const AbsoluteChainIds: Record<ChainIdEnum, AbsoluteChainIdEnum> = {
  [ChainIdEnum.arbi]: AbsoluteChainIdEnum.arbi,
  [ChainIdEnum.avax]: AbsoluteChainIdEnum.avax,
  [ChainIdEnum.bsc]: AbsoluteChainIdEnum.bsc,
  [ChainIdEnum.eth]: AbsoluteChainIdEnum.eth,
  [ChainIdEnum.ftm]: AbsoluteChainIdEnum.ftm,
  [ChainIdEnum.plg]: AbsoluteChainIdEnum.plg,
  [ChainIdEnum.xdai]: AbsoluteChainIdEnum.xdai,
  [ChainIdEnum.celo]: AbsoluteChainIdEnum.celo,
  [ChainIdEnum.mriver]: AbsoluteChainIdEnum.mriver,
  [ChainIdEnum.harm]: AbsoluteChainIdEnum.harm,
  [ChainIdEnum.heco]: AbsoluteChainIdEnum.heco,
  [ChainIdEnum.sol]: AbsoluteChainIdEnum.sol,
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
  [AbsoluteChainIdEnum.arbi]: ChainIdEnum.arbi,
  [AbsoluteChainIdEnum.avax]: ChainIdEnum.avax,
  [AbsoluteChainIdEnum.bsc]: ChainIdEnum.bsc,
  [AbsoluteChainIdEnum.eth]: ChainIdEnum.eth,
  [AbsoluteChainIdEnum.ftm]: ChainIdEnum.ftm,
  [AbsoluteChainIdEnum.plg]: ChainIdEnum.plg,
  [AbsoluteChainIdEnum.xdai]: ChainIdEnum.xdai,
  [AbsoluteChainIdEnum.celo]: ChainIdEnum.celo,
  [AbsoluteChainIdEnum.mriver]: ChainIdEnum.mriver,
  [AbsoluteChainIdEnum.harm]: ChainIdEnum.harm,
  [AbsoluteChainIdEnum.heco]: ChainIdEnum.heco,
  [AbsoluteChainIdEnum.sol]: ChainIdEnum.sol,
};

export const getInternalChainId = (chainId: ChainId): ChainId => InternalChainIds[chainId];

export const InternalChainIdByAbbr: Record<ChainAbbrEnum, ChainIdEnum> = {
  [ChainAbbrEnum.eth]: ChainIdEnum.eth,
  [ChainAbbrEnum.bsc]: ChainIdEnum.bsc,
  [ChainAbbrEnum.plg]: ChainIdEnum.plg,
  [ChainAbbrEnum.ftm]: ChainIdEnum.ftm,
  [ChainAbbrEnum.arbi]: ChainIdEnum.arbi,
  [ChainAbbrEnum.avax]: ChainIdEnum.avax,
  [ChainAbbrEnum.xdai]: ChainIdEnum.xdai,
  [ChainAbbrEnum.celo]: ChainIdEnum.celo,
  [ChainAbbrEnum.mriver]: ChainIdEnum.mriver,
  [ChainAbbrEnum.harm]: ChainIdEnum.harm,
  [ChainAbbrEnum.heco]: ChainIdEnum.heco,
};
