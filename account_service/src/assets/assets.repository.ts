import { EntityRepository, In, Repository } from 'typeorm';

import { ChainIdEnum } from '../common/enum';
import { Address, Chains } from '../common/interfaces';

import { AssetsForLambdaResponse } from './assets.interface';
import { AssetsEntity } from './entity/assets.entity';

@EntityRepository(AssetsEntity)
export class AssetsRepository extends Repository<AssetsEntity> {
  async findAllByAddressesAndChains(addresses: Address[], chains: Chains): Promise<AssetsEntity[]> {
    return await this.find({
      where: { address: In(addresses), chain: In(chains) },
    });
  }

  async findAll(): Promise<AssetsEntity[]> {
    return await this.find({
      where: { isReadyToMigrate: true },
    });
  }

  async findOneByAddressAndChain(address: string, chainId: ChainIdEnum): Promise<AssetsEntity> {
    return this.findOne({
      where: { address: address, chain: chainId },
    });
  }

  async findAllTrackedAssetsWithPoolsByChain(
    chainId: ChainIdEnum,
  ): Promise<AssetsForLambdaResponse[]> {
    return await this.query(lambdaAssetsSql, [chainId]);
  }
}

export const lambdaAssetsSql =
  'select an.address, an.id, an.decimals, an.name, an.symbol, an.chain_id as "chainId", ap.pairs from assets_new an full outer join assets_pools ap on an.id = ap.asset_id where an.chain_id = $1 and an.is_tracked = true and an.is_lp = false';
