import { plainToClass } from 'class-transformer';
import { Brackets, EntityRepository, Repository, SelectQueryBuilder } from 'typeorm';

import { PaginationResult } from '@app/common/dto/PaginationResult.dto';
import { OpportunitySearchQueryDto } from '@app/common/dto/opportunities/OpportunitySearchQuery.dto';
import { OpportunityCreateDto } from '@app/common/dto/opportunities/opportunity.create.dto';
import {
  IChainStats,
  IFeatureStats,
} from '@app/common/interfaces/services/opportunities/opportunity.stats.interfaces';
import { chunk } from '@app/common/utils';

import { OpportunityEntity } from '../entities/opportunity.entity';

@EntityRepository(OpportunityEntity)
export class OpportunityRepository extends Repository<OpportunityEntity> {
  /**
   * Gets the list of chains & the number of pools on each chain
   */
  async getChainStats(): Promise<IChainStats[]> {
    return this.query(`
      SELECT COUNT(DISTINCT id)::int as count, chain_id
      FROM opportunities
      GROUP BY chain_id
    `);
  }

  /**
   * Gets a list of the number of pools belonging to each feature
   */
  async getFeatureStats(): Promise<IFeatureStats[]> {
    return this.query(`
      SELECT COUNT(feature)::int as count, feature as feature
      FROM opportunities
      CROSS JOIN LATERAL UNNEST(categories) as feature
      GROUP BY feature
    `);
  }
  /**
   * Search, Sort, and Filter opportunities
   *
   * Searchable Fields:
   * - farm name
   * - deposit token address/name/symbol
   * - deposit underlying token address/name/symbol
   * - reward token address/name/symbol
   *
   * Filterable Fields
   * - categories
   * - min tvl
   * - min apr
   *
   * Sortable Fields
   * - Apr/apy/farm name/tvl
   *
   * @param queryParams paginated opportunity search query
   * @returns paginated results
   */
  async search(
    queryParams: OpportunitySearchQueryDto,
  ): Promise<PaginationResult<OpportunityEntity>> {
    const {
      search,
      limit,
      page,
      sortDirection,
      sortField,
      categories,
      minTVL,
      maxTVL,
      minAPR,
      maxAPR,
      chains,
    } = queryParams;

    const baseQuery = this.createQueryBuilder('opportunities')
      .leftJoinAndSelect('opportunities.farm', 'farm')
      .where(this.internalFuzzyFind(search))
      .andWhere(this.internalWhereInCategories(categories));

    if (minAPR) baseQuery.andWhere(`apr >= :minAPR`, { minAPR });
    if (maxAPR) baseQuery.andWhere(`apr <= :maxAPR`, { maxAPR });
    if (minTVL) baseQuery.andWhere(`total_value_locked >= :minTVL`, { minTVL });
    if (maxTVL) baseQuery.andWhere(`total_value_locked <= :maxTVL`, { maxTVL });

    if (chains && chains.length) {
      baseQuery.andWhere(`chain_id in (:...chains)`, { chains });
    }

    const [items, total] = await Promise.all([
      baseQuery
        .offset((page - 1) * limit)
        .limit(limit)
        .orderBy(sortField, sortDirection, 'NULLS LAST')
        .getMany(),

      baseQuery.getCount(),
    ]);

    return plainToClass(PaginationResult, {
      items,
      total,
      count: items.length,
      limit,
      pages: Math.ceil(total / limit),
      page: page,
    });
  }

  private internalWhereInCategories(categories: string[]) {
    return new Brackets((query: SelectQueryBuilder<OpportunityEntity>) => {
      if (categories.length) {
        const first = categories.shift();
        query.where('categories @> :category0', { category0: [first] });
        categories.forEach((category, idx) => {
          query.orWhere(`categories @> :category${idx + 1}`, {
            [`category${idx + 1}`]: [category],
          });
        });
      }
    });
  }

  private internalFuzzyFind(search: string) {
    const exactSearch = search.toLowerCase();
    const fuzzySearch = `%${exactSearch}%`;

    const parameters = {
      farm: fuzzySearch,
      symbol: exactSearch,
      name: fuzzySearch,
      address: exactSearch,
      symbolJson: `[{"symbol": "${exactSearch}" }]`,
      nameJson: `[{"name": "${exactSearch}" }]`,
      addrJson: `[{"address": "${exactSearch}" }]`,
    };

    return new Brackets(function (query: SelectQueryBuilder<OpportunityEntity>) {
      query
        .where(`farm.name ILIKE :farm`)
        // Deposit Token
        .orWhere("opportunities.tokens::jsonb -> 'deposit' ->> 'symbol' ILIKE :symbol")
        .orWhere("opportunities.tokens::jsonb -> 'deposit' ->> 'name' ILIKE :name")
        .orWhere("opportunities.tokens::jsonb -> 'deposit' ->> 'address' ILIKE :address")

        // Underlying deposit tokens
        .orWhere(
          `LOWER(opportunities.tokens::text)::jsonb->'deposit'->'tokens' @> LOWER(:symbolJson)::jsonb`,
        )
        .orWhere(
          `LOWER(opportunities.tokens::text)::jsonb->'deposit'->'tokens' @> LOWER(:nameJson)::jsonb`,
        )
        .orWhere(
          `LOWER(opportunities.tokens::text)::jsonb->'deposit'->'tokens' @> LOWER(:addrJson)::jsonb`,
        )
        // reward token
        .orWhere(`LOWER(opportunities.tokens::text)::jsonb->'rewards' @> LOWER(:symbolJson)::jsonb`)
        .orWhere(`LOWER(opportunities.tokens::text)::jsonb->'rewards' @> LOWER(:nameJson)::jsonb`)
        .orWhere(`LOWER(opportunities.tokens::text)::jsonb->'rewards' @> LOWER(:addrJson)::jsonb`)
        .setParameters(parameters);
    });
  }

  async findItem(endpointId: number): Promise<OpportunityEntity> {
    return this.findOne(endpointId, { relations: ['farm'] });
  }

  async replaceAll(
    opportunities: OpportunityCreateDto[],
  ): Promise<{ ids: number[]; count: number }> {
    return this.manager.connection.transaction(async (manager) => {
      await manager
        .createQueryBuilder(OpportunityEntity, 'opportunities') //
        .delete()
        .execute();

      const chunkInserted = await Promise.all(
        chunk(opportunities, 1500).map((opportunityChunk) =>
          manager //
            .createQueryBuilder(OpportunityEntity, 'opportunities')
            .insert()
            .values(opportunityChunk)
            .execute(),
        ),
      );

      const updatedIds = chunkInserted.reduce(
        (acc, cur) => acc.concat(...cur.identifiers.map(({ id }) => id)),
        [],
      );

      return {
        ids: updatedIds,
        count: updatedIds.length,
      };
    });
  }
}
