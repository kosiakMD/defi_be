import {
  ABSOLUTE_CHAIN_ID_BSC,
  ABSOLUTE_CHAIN_ID_ETH,
  ABSOLUTE_CHAIN_ID_POLYGON,
  CHAIN_ID_BSC,
  CHAIN_ID_ETH,
  CHAIN_ID_POLYGON,
} from 'src/common/constatnt';
import { ChainId } from 'src/common/types';

export const AbsoluteChainIds = {
  [CHAIN_ID_ETH]: ABSOLUTE_CHAIN_ID_ETH,
  [CHAIN_ID_BSC]: ABSOLUTE_CHAIN_ID_BSC,
  [CHAIN_ID_POLYGON]: ABSOLUTE_CHAIN_ID_POLYGON,
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

export const InternalChainIds = {
  [ABSOLUTE_CHAIN_ID_ETH]: CHAIN_ID_ETH,
  [ABSOLUTE_CHAIN_ID_BSC]: CHAIN_ID_BSC,
  [ABSOLUTE_CHAIN_ID_POLYGON]: CHAIN_ID_POLYGON,
};

export const getInternalChainId = (chainId: ChainId): ChainId => InternalChainIds[chainId];
