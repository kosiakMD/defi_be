import { EntityRepository, In, Repository } from 'typeorm';

import { Address, Chains } from '@app/common/types';

import { AssetsForLambdaResponse } from '../../../common/interfaces/assets.interface';

import { AssetsEntity } from '../entities/assets.entity';

@EntityRepository(AssetsEntity)
export class AssetsRepository extends Repository<AssetsEntity> {
  async saveAsset(asset: AssetsEntity): Promise<AssetsEntity> {
    await this.save(asset);
    return await this.findOneByAddressAndChain(asset.address, asset.chain);
  }

  async findAllByAddressesAndChains(addresses: Address[], chains: Chains): Promise<AssetsEntity[]> {
    return await this.find({
      where: { address: In(addresses), chain: In(chains) },
    });
  }

  async findAll(): Promise<AssetsEntity[]> {
    return await this.find({
      where: { isTracked: true },
    });
  }

  async findAllUnderlying(assetId: number): Promise<AssetsEntity[]> {
    const query = `
        select "assets"."id"                    as "assets_id",
               "assets"."address"               as "assets_address",
               "assets"."name"                  as "assets_name",
               "assets"."symbol"                as "assets_symbol",
               "assets"."icon"                  as "assets_icon",
               "assets"."chain_id"              as "assets_chain_id",
               "assets"."decimals"              as "assets_decimals",
               "assets"."is_analytic_available" as "assets_is_analytic_available",
               "assets"."is_lp"                 as "assets_is_lp",
               "assets"."is_tracked"            as "assets_is_tracked",
               "assets_underlying"."position_in_pool" as "position_in_pool"
        from "assets_underlying"
                 join "assets_new" "assets" on "assets_underlying"."underlying_asset_id" = "assets"."id"
        where "assets_underlying"."lp_asset_id" = ${assetId};
    `;
    const queryResult = await this.manager.query(query);

    return queryResult.map((a) => {
      const an = new AssetsEntity();
      an.id = a.assets_id;
      an.address = a.assets_address;
      an.name = a.assets_name;
      an.symbol = a.assets_symbol;
      an.icon = a.assets_icon;
      an.chain = a.assets_chain_id;
      an.decimals = a.assets_decimals;
      an.isAnalyticAvailable = a.assets_is_analytic_available;
      an.isLp = a.assets_is_lp;
      an.isTracked = a.assets_is_tracked;
      an.positionInPool = a.position_in_pool;
      return an;
    });
  }

  async findOneByAddressAndChain(address: string, chainId: number): Promise<AssetsEntity> {
    return this.findOne({
      where: { address: address, chain: chainId },
    });
  }

  async findAllTrackedAssetsWithPoolsByChain(chainId: number): Promise<AssetsForLambdaResponse[]> {
    const lambdaAssetsSql = `
      select
        an.address,
        an.id,
        an.decimals,
        an.name,
        an.symbol,
        an.chain_id as "chainId",
        ap.pairs,
        ap.created_at as "createdAt"
      from assets_new an
      full outer join assets_pools ap
        on an.id = ap.asset_id
      where
        an.chain_id = $1 and
        an.is_tracked = true and
        an.is_lp = false
    `;

    return await this.query(lambdaAssetsSql, [chainId]);
  }

  async createRelation(
    lpAssetId: number,
    underlyingAssetId: number,
    positionInPool: number,
  ): Promise<void> {
    const insertSql = `insert into assets_underlying (lp_asset_id, underlying_asset_id, position_in_pool) values (${lpAssetId}, ${underlyingAssetId}, ${positionInPool})
        on conflict (lp_asset_id, underlying_asset_id) do update set position_in_pool = excluded.position_in_pool;
        `;
    return await this.query(insertSql);
  }

  async findAssetsByParams(searchParams): Promise<AssetsEntity[]> {
    // eslint-disable-next-line prefer-const
    let { address, text } = searchParams;
    if (text) {
      text = `%${text}%`.toLowerCase();
    }
    const qb = this.createQueryBuilder('assets_new');
    qb.where('is_tracked = :isTracked', { isTracked: true });
    if (address && text) {
      qb.andWhere(
        '((LOWER(name) LIKE :name) OR (LOWER(symbol) LIKE :symbol) OR (address = :address))',
        {
          name: text,
          symbol: text,
          address,
        },
      );
    } else if (address) {
      qb.andWhere('address = :address', { address });
    } else {
      qb.andWhere('(LOWER(name) LIKE :name OR LOWER(symbol) LIKE :symbol)', {
        name: text,
        symbol: text,
      });
    }
    qb.orderBy({
      'assets_new.name': 'ASC',
      'assets_new.symbol': 'ASC',
    });
    qb.limit(searchParams.limit || 30);
    return qb.getMany();
  }
}
