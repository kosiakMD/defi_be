import { EntityRepository, In, Repository } from 'typeorm';

import { Address, Chains } from '@app/common/types';

import { AssetsForLambdaResponse } from '../../../common/interfaces/assets.interface';

import { AssetsEntity } from '../entities/assets.entity';

@EntityRepository(AssetsEntity)
export class AssetsRepository extends Repository<AssetsEntity> {
  // async findOneByAddressAndChain(address: string, chainId: number): Promise<AssetsEntity> {
  //   return this.findOne({
  //     where: { address: address, chain: chainId },
  //   });
  // }

  // TODO: TBD if this is used at all. See getAssetAndPoolObjects in assets.service
  // async findAllTrackedAssetsWithPoolsByChain(chainId: number): Promise<AssetsForLambdaResponse[]> {
  //   const lambdaAssetsSql = `
  //     select
  //       an.address,
  //       an.id,
  //       an.decimals,
  //       an.name,
  //       an.symbol,
  //       an.chain_id as "chainId",
  //       ap.pairs,
  //       ap.created_at as "createdAt"
  //     from assets_new an
  //     full outer join assets_pools ap
  //       on an.id = ap.asset_id
  //     where
  //       an.chain_id = $1 and
  //       an.is_tracked = true and
  //       an.is_lp = false
  //   `;
  //
  //   return await this.query(lambdaAssetsSql, [chainId]);
  // }
  // async createRelation(
  //   lpAssetId: number,
  //   underlyingAssetId: number,
  //   positionInPool: number,
  // ): Promise<void> {
  //   const insertSql = `insert into assets_underlying (lp_asset_id, underlying_asset_id, position_in_pool) values (${lpAssetId}, ${underlyingAssetId}, ${positionInPool})
  //       on conflict (lp_asset_id, underlying_asset_id) do update set position_in_pool = excluded.position_in_pool;
  //       `;
  //   return await this.query(insertSql);
  // }
}
