import { plainToClass } from 'class-transformer';

import { ChainDto } from '@app/common';
import {
  CARDANO_COIN_ADDRESS,
  COSMOS_COIN_ADDRESS,
  RONIN_COIN_ADDRESS,
  SOL_COIN_ADDRESS,
  ZERO_ADDRESS,
} from '@app/common/constant';
import {
  AbsoluteChainIdEnum,
  ChainAbbrEnum,
  ChainIdEnum,
  ChainNameEnum,
  CoingeckoPlatformEnum,
} from '@app/common/enum';
import { ChainId } from '@app/common/types';
import { isZeroAddress } from '@app/common/utils/addresses';

export const AbsoluteChainIds: Record<ChainIdEnum, AbsoluteChainIdEnum> = {
  [ChainIdEnum.arbi]: AbsoluteChainIdEnum.arbi,
  [ChainIdEnum.avax]: AbsoluteChainIdEnum.avax,
  [ChainIdEnum.bnb]: AbsoluteChainIdEnum.bnb,
  [ChainIdEnum.eth]: AbsoluteChainIdEnum.eth,
  [ChainIdEnum.ftm]: AbsoluteChainIdEnum.ftm,
  [ChainIdEnum.plg]: AbsoluteChainIdEnum.plg,
  [ChainIdEnum.gnosis]: AbsoluteChainIdEnum.gnosis,
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
  [ChainIdEnum.klay]: AbsoluteChainIdEnum.klay,
  [ChainIdEnum.fuse]: AbsoluteChainIdEnum.fuse,
  [ChainIdEnum.cardano]: AbsoluteChainIdEnum.cardano,
  [ChainIdEnum.metis]: AbsoluteChainIdEnum.metis,
  [ChainIdEnum.ronin]: AbsoluteChainIdEnum.ronin,
  [ChainIdEnum.cosmos]: AbsoluteChainIdEnum.cosmos,
  [ChainIdEnum.kava]: AbsoluteChainIdEnum.kava,
  [ChainIdEnum.osmosis]: AbsoluteChainIdEnum.osmosis,
  [ChainIdEnum.secret]: AbsoluteChainIdEnum.secret,
  [ChainIdEnum.iotex]: AbsoluteChainIdEnum.iotex,
  [ChainIdEnum.milkomeda]: AbsoluteChainIdEnum.milkomeda,
  [ChainIdEnum.moonbeam]: AbsoluteChainIdEnum.moonbeam,
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
  [AbsoluteChainIdEnum.bnb]: ChainIdEnum.bnb,
  [AbsoluteChainIdEnum.eth]: ChainIdEnum.eth,
  [AbsoluteChainIdEnum.ftm]: ChainIdEnum.ftm,
  [AbsoluteChainIdEnum.plg]: ChainIdEnum.plg,
  [AbsoluteChainIdEnum.gnosis]: ChainIdEnum.gnosis,
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
  [AbsoluteChainIdEnum.klay]: ChainIdEnum.klay,
  [AbsoluteChainIdEnum.fuse]: ChainIdEnum.fuse,
  [AbsoluteChainIdEnum.cardano]: ChainIdEnum.cardano,
  [AbsoluteChainIdEnum.metis]: ChainIdEnum.metis,
  [AbsoluteChainIdEnum.ronin]: ChainIdEnum.ronin,
  [AbsoluteChainIdEnum.cosmos]: ChainIdEnum.cosmos,
  [AbsoluteChainIdEnum.kava]: ChainIdEnum.kava,
  [AbsoluteChainIdEnum.osmosis]: ChainIdEnum.osmosis,
  [AbsoluteChainIdEnum.secret]: ChainIdEnum.secret,
  [AbsoluteChainIdEnum.iotex]: ChainIdEnum.iotex,
  [AbsoluteChainIdEnum.milkomeda]: ChainIdEnum.milkomeda,
  [AbsoluteChainIdEnum.moonbeam]: ChainIdEnum.moonbeam,
};

export const getInternalChainId = (chainId: ChainId): ChainId => InternalChainIds[chainId];

export const InternalChainIdByAbbr: Record<ChainAbbrEnum, ChainIdEnum> = {
  [ChainAbbrEnum.eth]: ChainIdEnum.eth,
  [ChainAbbrEnum.bnb]: ChainIdEnum.bnb,
  [ChainAbbrEnum.plg]: ChainIdEnum.plg,
  [ChainAbbrEnum.ftm]: ChainIdEnum.ftm,
  [ChainAbbrEnum.arbi]: ChainIdEnum.arbi,
  [ChainAbbrEnum.avax]: ChainIdEnum.avax,
  [ChainAbbrEnum.gnosis]: ChainIdEnum.gnosis,
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
  [ChainAbbrEnum.klay]: ChainIdEnum.klay,
  [ChainAbbrEnum.fuse]: ChainIdEnum.fuse,
  [ChainAbbrEnum.cardano]: ChainIdEnum.cardano,
  [ChainAbbrEnum.metis]: ChainIdEnum.metis,
  [ChainAbbrEnum.ronin]: ChainIdEnum.ronin,
  [ChainAbbrEnum.cosmos]: ChainIdEnum.cosmos,
  [ChainAbbrEnum.kava]: ChainIdEnum.kava,
  [ChainAbbrEnum.osmosis]: ChainIdEnum.osmosis,
  [ChainAbbrEnum.secret]: ChainIdEnum.secret,
  [ChainAbbrEnum.iotex]: ChainIdEnum.iotex,
  [ChainAbbrEnum.milkomeda]: ChainIdEnum.milkomeda,
  [ChainAbbrEnum.moonbeam]: ChainIdEnum.moonbeam,
};

export const CoingeckoChainIds: Record<ChainIdEnum, CoingeckoPlatformEnum> = {
  [ChainIdEnum.eth]: CoingeckoPlatformEnum.eth,
  [ChainIdEnum.bnb]: CoingeckoPlatformEnum.bnb,
  [ChainIdEnum.plg]: CoingeckoPlatformEnum.plg,
  [ChainIdEnum.ftm]: CoingeckoPlatformEnum.ftm,
  [ChainIdEnum.arbi]: CoingeckoPlatformEnum.arbi,
  [ChainIdEnum.avax]: CoingeckoPlatformEnum.avax,
  [ChainIdEnum.gnosis]: CoingeckoPlatformEnum.gnosis,
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
  [ChainIdEnum.klay]: CoingeckoPlatformEnum.klay,
  [ChainIdEnum.fuse]: CoingeckoPlatformEnum.fuse,
  [ChainIdEnum.cardano]: CoingeckoPlatformEnum.cardano,
  [ChainIdEnum.metis]: CoingeckoPlatformEnum.metis,
  [ChainIdEnum.ronin]: CoingeckoPlatformEnum.ronin,
  [ChainIdEnum.cosmos]: CoingeckoPlatformEnum.cosmos,
  [ChainIdEnum.kava]: CoingeckoPlatformEnum.kava,
  [ChainIdEnum.osmosis]: CoingeckoPlatformEnum.osmosis,
  [ChainIdEnum.secret]: CoingeckoPlatformEnum.secret,
  [ChainIdEnum.iotex]: CoingeckoPlatformEnum.iotex,
  [ChainIdEnum.milkomeda]: CoingeckoPlatformEnum.milkomeda,
  [ChainIdEnum.moonbeam]: CoingeckoPlatformEnum.moonbeam,
};

export const getCoingeckoPlatformId = (chainId: ChainId): CoingeckoPlatformEnum =>
  CoingeckoChainIds[chainId];

export const ChainCoinAddresses: Record<ChainIdEnum, string> = {
  [ChainIdEnum.eth]: ZERO_ADDRESS,
  [ChainIdEnum.bnb]: ZERO_ADDRESS,
  [ChainIdEnum.plg]: ZERO_ADDRESS,
  [ChainIdEnum.ftm]: ZERO_ADDRESS,
  [ChainIdEnum.arbi]: ZERO_ADDRESS,
  [ChainIdEnum.avax]: ZERO_ADDRESS,
  [ChainIdEnum.gnosis]: ZERO_ADDRESS,
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
  [ChainIdEnum.klay]: ZERO_ADDRESS,
  [ChainIdEnum.fuse]: ZERO_ADDRESS,
  [ChainIdEnum.cardano]: CARDANO_COIN_ADDRESS,
  [ChainIdEnum.metis]: ZERO_ADDRESS,
  [ChainIdEnum.ronin]: RONIN_COIN_ADDRESS,
  [ChainIdEnum.cosmos]: COSMOS_COIN_ADDRESS,
  [ChainIdEnum.kava]: COSMOS_COIN_ADDRESS,
  [ChainIdEnum.osmosis]: COSMOS_COIN_ADDRESS,
  [ChainIdEnum.secret]: COSMOS_COIN_ADDRESS,
  [ChainIdEnum.iotex]: ZERO_ADDRESS,
  [ChainIdEnum.milkomeda]: ZERO_ADDRESS,
  [ChainIdEnum.moonbeam]: ZERO_ADDRESS,
};

export const getChainByAbbr = (symbol: ChainAbbrEnum | string): ChainDto => {
  return plainToClass(ChainDto, {
    id: ChainIdEnum[symbol],
    name: ChainNameEnum[symbol],
    abbr: ChainAbbrEnum[symbol],
  });
};

export const getChainById = (chainId: ChainIdEnum): ChainDto => {
  return getChainByAbbr(ChainIdEnum[chainId]);
};

export const isEVMChain = (chainId: ChainIdEnum): boolean => {
  return isZeroAddress(ChainCoinAddresses[chainId]);
};

export const CoinSymbols: Record<ChainIdEnum, string> = {
  [ChainIdEnum.eth]: 'ETH',
  [ChainIdEnum.bnb]: 'BNB',
  [ChainIdEnum.plg]: 'MATIC',
  [ChainIdEnum.ftm]: 'FTM',
  [ChainIdEnum.arbi]: 'ETH',
  [ChainIdEnum.avax]: 'AVAX',
  [ChainIdEnum.gnosis]: 'xDai',
  [ChainIdEnum.celo]: 'CELO',
  [ChainIdEnum.mriver]: 'MOVR',
  [ChainIdEnum.harm]: 'ONE',
  [ChainIdEnum.heco]: 'HT',
  [ChainIdEnum.sol]: 'SOL',
  [ChainIdEnum.okex]: 'OKT',
  [ChainIdEnum.cro]: 'CRO',
  [ChainIdEnum.boba]: 'ETH',
  [ChainIdEnum.kcc]: 'KCS',
  [ChainIdEnum.opt]: 'ETH',
  [ChainIdEnum.near]: 'ETH',
  [ChainIdEnum.terra]: 'LUNA',
  [ChainIdEnum.klay]: 'KLAY',
  [ChainIdEnum.fuse]: 'FUSE',
  [ChainIdEnum.cardano]: 'ADA',
  [ChainIdEnum.metis]: 'METIS',
  [ChainIdEnum.ronin]: 'RON',
  [ChainIdEnum.cosmos]: 'ATOM',
  [ChainIdEnum.kava]: 'KAVA',
  [ChainIdEnum.osmosis]: 'OSMO',
  [ChainIdEnum.secret]: 'SCRT',
  [ChainIdEnum.iotex]: 'IOTX',
  [ChainIdEnum.milkomeda]: 'ADA',
  [ChainIdEnum.moonbeam]: 'GLMR',
};

export const CoinNames: Record<ChainIdEnum, string> = {
  [ChainIdEnum.eth]: 'Ethereum',
  [ChainIdEnum.bnb]: 'Binance Coin',
  [ChainIdEnum.plg]: 'Polygon',
  [ChainIdEnum.ftm]: 'Fantom',
  [ChainIdEnum.arbi]: 'Ethereum',
  [ChainIdEnum.avax]: 'Avalanche',
  [ChainIdEnum.gnosis]: 'xDai',
  [ChainIdEnum.celo]: 'Celo',
  [ChainIdEnum.mriver]: 'Moonriver',
  [ChainIdEnum.harm]: 'Harmony',
  [ChainIdEnum.heco]: 'Huobi Token',
  [ChainIdEnum.sol]: 'Solana',
  [ChainIdEnum.okex]: 'OEC Token',
  [ChainIdEnum.cro]: 'Crypto.com Coin',
  [ChainIdEnum.boba]: 'Ethereum',
  [ChainIdEnum.kcc]: 'KuCoin Token',
  [ChainIdEnum.opt]: 'Ethereum',
  [ChainIdEnum.near]: 'Ethereum',
  [ChainIdEnum.terra]: 'Terra',
  [ChainIdEnum.klay]: 'Klaytn',
  [ChainIdEnum.fuse]: 'Fuse',
  [ChainIdEnum.cardano]: 'Cardano',
  [ChainIdEnum.metis]: 'MetisDAO',
  [ChainIdEnum.ronin]: 'Ronin',
  [ChainIdEnum.cosmos]: 'Cosmos',
  [ChainIdEnum.kava]: 'Kava',
  [ChainIdEnum.osmosis]: 'Osmosis',
  [ChainIdEnum.secret]: 'Secret',
  [ChainIdEnum.iotex]: 'IoTeX',
  [ChainIdEnum.milkomeda]: 'Cardano',
  [ChainIdEnum.moonbeam]: 'Moonbeam',
};
