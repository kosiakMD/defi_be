import { SOL_COIN_ADDRESS, ZERO_ADDRESS } from '@app/common/constant';
import {
  AbsoluteChainIdEnum,
  ChainAbbrEnum,
  ChainIdEnum,
  CoingeckoPlatformEnum,
} from '@app/common/enum';
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
  [ChainIdEnum.okex]: AbsoluteChainIdEnum.okex,
  [ChainIdEnum.cro]: AbsoluteChainIdEnum.cro,
  [ChainIdEnum.boba]: AbsoluteChainIdEnum.boba,
  [ChainIdEnum.kcc]: AbsoluteChainIdEnum.kcc,
  [ChainIdEnum.opt]: AbsoluteChainIdEnum.opt,
  [ChainIdEnum.near]: AbsoluteChainIdEnum.near,
  [ChainIdEnum.terra]: AbsoluteChainIdEnum.terra,
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
  [AbsoluteChainIdEnum.okex]: ChainIdEnum.okex,
  [AbsoluteChainIdEnum.cro]: ChainIdEnum.cro,
  [AbsoluteChainIdEnum.boba]: ChainIdEnum.boba,
  [AbsoluteChainIdEnum.kcc]: ChainIdEnum.kcc,
  [AbsoluteChainIdEnum.opt]: ChainIdEnum.opt,
  [AbsoluteChainIdEnum.near]: ChainIdEnum.near,
  [AbsoluteChainIdEnum.terra]: ChainIdEnum.terra,
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
  [ChainAbbrEnum.sol]: ChainIdEnum.sol,
  [ChainAbbrEnum.okex]: ChainIdEnum.okex,
  [ChainAbbrEnum.cro]: ChainIdEnum.cro,
  [ChainAbbrEnum.boba]: ChainIdEnum.boba,
  [ChainAbbrEnum.kcc]: ChainIdEnum.kcc,
  [ChainAbbrEnum.opt]: ChainIdEnum.opt,
  [ChainAbbrEnum.near]: ChainIdEnum.near,
  [ChainAbbrEnum.terra]: ChainIdEnum.terra,
};

export const CoingeckoChainIds: Record<ChainIdEnum, CoingeckoPlatformEnum> = {
  [ChainIdEnum.eth]: CoingeckoPlatformEnum.eth,
  [ChainIdEnum.bsc]: CoingeckoPlatformEnum.bsc,
  [ChainIdEnum.plg]: CoingeckoPlatformEnum.plg,
  [ChainIdEnum.ftm]: CoingeckoPlatformEnum.ftm,
  [ChainIdEnum.arbi]: CoingeckoPlatformEnum.arbi,
  [ChainIdEnum.avax]: CoingeckoPlatformEnum.avax,
  [ChainIdEnum.xdai]: CoingeckoPlatformEnum.xdai,
  [ChainIdEnum.celo]: CoingeckoPlatformEnum.celo,
  [ChainIdEnum.mriver]: CoingeckoPlatformEnum.mriver,
  [ChainIdEnum.harm]: CoingeckoPlatformEnum.harm,
  [ChainIdEnum.heco]: CoingeckoPlatformEnum.heco,
  [ChainIdEnum.sol]: CoingeckoPlatformEnum.sol,
  [ChainIdEnum.okex]: CoingeckoPlatformEnum.okex,
  [ChainIdEnum.cro]: CoingeckoPlatformEnum.cro,
  [ChainIdEnum.boba]: CoingeckoPlatformEnum.boba,
  [ChainIdEnum.kcc]: CoingeckoPlatformEnum.kcc,
  [ChainIdEnum.opt]: CoingeckoPlatformEnum.opt,
  [ChainIdEnum.near]: CoingeckoPlatformEnum.near,
  [ChainIdEnum.terra]: CoingeckoPlatformEnum.terra,
};

export const getCoingeckoPlatformId = (chainId: ChainId): CoingeckoPlatformEnum =>
  CoingeckoChainIds[chainId];

export const ChainCoinAddresses: Record<ChainIdEnum, string> = {
  [ChainIdEnum.eth]: ZERO_ADDRESS,
  [ChainIdEnum.bsc]: ZERO_ADDRESS,
  [ChainIdEnum.plg]: ZERO_ADDRESS,
  [ChainIdEnum.ftm]: ZERO_ADDRESS,
  [ChainIdEnum.arbi]: ZERO_ADDRESS,
  [ChainIdEnum.avax]: ZERO_ADDRESS,
  [ChainIdEnum.xdai]: ZERO_ADDRESS,
  [ChainIdEnum.celo]: ZERO_ADDRESS,
  [ChainIdEnum.mriver]: ZERO_ADDRESS,
  [ChainIdEnum.harm]: ZERO_ADDRESS,
  [ChainIdEnum.heco]: ZERO_ADDRESS,
  [ChainIdEnum.sol]: SOL_COIN_ADDRESS,
  [ChainIdEnum.okex]: ZERO_ADDRESS,
  [ChainIdEnum.cro]: ZERO_ADDRESS,
  [ChainIdEnum.boba]: ZERO_ADDRESS,
  [ChainIdEnum.kcc]: ZERO_ADDRESS,
  [ChainIdEnum.opt]: ZERO_ADDRESS,
  [ChainIdEnum.near]: ZERO_ADDRESS,
  [ChainIdEnum.terra]: ZERO_ADDRESS,
};

export const getCoinAddress = (chainId: ChainId): CoingeckoPlatformEnum =>
  CoingeckoChainIds[chainId];

export const CoingeckoCoinIds: Record<ChainIdEnum, string> = {
  [ChainIdEnum.eth]: '',
  [ChainIdEnum.bsc]: '',
  [ChainIdEnum.plg]: '',
  [ChainIdEnum.ftm]: '',
  [ChainIdEnum.arbi]: '',
  [ChainIdEnum.avax]: '',
  [ChainIdEnum.xdai]: '',
  [ChainIdEnum.celo]: '',
  [ChainIdEnum.mriver]: '',
  [ChainIdEnum.harm]: '',
  [ChainIdEnum.heco]: '',
  [ChainIdEnum.sol]: 'solana',
  [ChainIdEnum.okex]: '',
  [ChainIdEnum.cro]: '',
  [ChainIdEnum.boba]: '',
  [ChainIdEnum.kcc]: '',
  [ChainIdEnum.opt]: '',
  [ChainIdEnum.near]: '',
  [ChainIdEnum.terra]: '',
};

export const getCoingeckoCoinId = (chainId: ChainId): string => CoingeckoCoinIds[chainId];
