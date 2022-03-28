import { In, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ChainId } from '@app/common';
import {
  CARDANO_COIN_ADDRESS,
  COSMOS_COIN_ADDRESS,
  RONIN_COIN_ADDRESS,
  SOL_COIN_ADDRESS,
  ZERO_ADDRESS,
} from '@app/common/constant';
import { CrudService } from '@app/common/services/crud.service';

import { ChainsEntity } from './entities/chain.entity';

@Injectable()
export class ChainsService extends CrudService<ChainsEntity> {
  constructor(
    @InjectRepository(ChainsEntity) private readonly chainRepository: Repository<ChainsEntity>,
  ) {
    super(chainRepository);
  }

  public async getChainIdByName(name: string) {
    const chain = await this.get({ name });
    return chain.id;
  }

  public async getManyChainIdsByNames(names: string[]) {
    const chains = await this.getAll({
      where: {
        name: In(names),
      },
    });

    return chains.map((c) => c.id);
  }

  public async getChainNameById(id) {
    return await this.get({ id });
  }

  public async getChainAbbrByNameOrAbbr(name: string) {
    let chain = await this.get({ name });
    if (chain) return chain;
    chain = await this.get({ abbr: name });
    return chain.abbr;
  }

  public async getInternalChainIdByAbsId(chainId) {
    const chains = await this.getAll();
    const chain = chains.find((c) => c.metadata.absoluteChainId === chainId);
    return chain.id;
  }

  // 3rd party platforms

  public async getCoingeckoPlatformId(chainId: ChainId) {
    const chain = await this.get({ id: chainId });
    return chain.metadata.coingeckoPlatformId;
  }

  public async debankPlatformId(chainId: ChainId) {
    const chain = await this.get({ id: chainId });
    return chain.metadata.debankPlatformId;
  }

  public async getAbsoluteChainId(chainId) {
    const chain = await this.get({ id: chainId });
    return chain.metadata.absoluteChainId;
  }
}

enum AbsoluteChainIdEnum {
  eth = 1,
  bnb = 56,
  plg = 137,
  ftm = 250,
  arbi = 42161,
  avax = 43114,
  gnosis = 100,
  celo = 42220,
  mriver = 1285,
  harm = 1666600000,
  heco = 128,
  sol = 101,
  okex = 66,
  cro = 25,
  boba = 288,
  kcc = 321,
  opt = 10,
  near = 1313161554,
  klay = 8217,
  fuse = 122,
  metis = 1088,

  // INFO: Not EVM chains
  cardano = 1003,
  cosmos = 2004,
  kava = 2005,
  osmosis = 2006,
  secret = 2007,
  terra = 'columbus-5',
  ronin = 1002,
}

enum ChainIdEnum {
  eth = 1,
  bnb = 2,
  plg = 3,
  ftm = 4,
  arbi = 5,
  avax = 6,
  gnosis = 7,
  celo = 8,
  mriver = 9,
  harm = 10,
  heco = 11,
  sol = 12,
  okex = 13,
  cro = 14,
  boba = 15,
  kcc = 16,
  opt = 17,
  near = 18,
  terra = 19,
  klay = 20,
  fuse = 21,
  cardano = 22,
  metis = 24,
  ronin = 27,
  cosmos = 23,
  kava = 28,
  osmosis = 29,
  secret = 30,
}

const InternalChainIds = {
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
};

const ChainCoinAddresses = {
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
};

enum CoingeckoPlatformEnum {
  eth = 'ethereum',
  bnb = 'binance-smart-chain',
  plg = 'polygon-pos',
  ftm = 'fantom',
  arbi = 'arbitrum-one',
  avax = 'avalanche',
  gnosis = 'xdai',
  celo = 'celo',
  mriver = 'moonriver',
  harm = 'harmony-shard-0',
  heco = 'huobi-token',
  sol = 'solana',
  okex = 'okex-chain',
  cro = 'cronos',
  boba = 'boba',
  kcc = 'kucoin-community-chain',
  opt = 'optimistic-ethereum',
  near = 'near-protocol',
  terra = 'terra',
  vvs = 'vvs',
  klay = 'klay-token',
  fuse = '',
  cardano = 'cardano',
  metis = 'metis-andromeda',
  ronin = 'ronin',
  cosmos = 'cosmos',
  kava = 'kava',
  osmosis = 'osmosis',
  secret = 'secret',
}
const CoingeckoChainIds = {
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
};
