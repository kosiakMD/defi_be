import { EntityRepository, FindManyOptions, Repository } from 'typeorm';

import { ChainIdEnum } from '@app/common/enum';

import { AssetsListQueryDto } from '../dto/assets-list-query.dto';
import { AssetsEntity } from '../entities/assets.entity';

@EntityRepository(AssetsEntity)
export class AssetsRepository extends Repository<AssetsEntity> {
  findAllAssetsWithPrices(
    queryListParams: AssetsListQueryDto,
    queryOptions?: FindManyOptions,
  ): Promise<AssetsEntity[]> {
    const { limit, page } = queryListParams;
    const findManyOptions: FindManyOptions = {
      skip: (page - 1) * limit,
      take: limit,
    };
    // findManyOptions.join = {
    //   alias: 'price',
    //   leftJoinAndSelect: {
    //     price: 'assets_prices.asset_id',
    //   },
    // };
    if (queryOptions) {
      findManyOptions.where = queryOptions.where;
    }
    // if (sortField && sortDirection) {
    //   findManyOptions.order = {};
    //   findManyOptions.order[sortField] = sortDirection;
    // }
    return this.find(findManyOptions);
  }

  async findOneByAddressAndChain(address: string, chainId: ChainIdEnum): Promise<AssetsEntity> {
    return this.findOne({
      where: { address, chainId },
    });
  }

  async getAllTrackedAssetChains(): Promise<number[]> {
    return (
      await this.query(`
      SELECT DISTINCT ON ("assets"."chain_id") "assets"."chain_id"
      FROM "assets"
      WHERE "assets"."is_tracked" IS true
      GROUP BY "assets"."chain_id"
      ORDER BY "assets"."chain_id" ASC
    `)
    ).flatMap((item) => Object.values(item));
  }

  async findAssetsByParams(searchParams): Promise<AssetsEntity[]> {
    // eslint-disable-next-line prefer-const
    let { address, text } = searchParams;
    if (text) {
      text = `%${text}%`.toLowerCase();
    }
    const qb = this.createQueryBuilder('assets');
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
      'assets.name': 'ASC',
      'assets.symbol': 'ASC',
    });
    qb.limit(searchParams.limit || 30);
    return qb.getMany();
  }
}
