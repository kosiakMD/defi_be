import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../common/constatnt';
import { ChainId } from '../common/types';

export const AbsoluteChainIds = {
  [CHAIN_ID_ETH]: 1,
  [CHAIN_ID_BSC]: 56,
};

export const getAbsoluteChainId = (chainId: ChainId): ChainId => AbsoluteChainIds[chainId];

export const getAbsoluteChainIds = (chainIds: ChainId[] | Iterable<number>): ChainId[] => {
  const mapping = (obj): ChainId[] => obj.map(getAbsoluteChainId);
  if (Array.isArray(chainIds)) {
    return mapping(chainIds);
  } else if (typeof chainIds[Symbol.iterator] === 'function') {
    return mapping(Array.from(chainIds));
  }
};
