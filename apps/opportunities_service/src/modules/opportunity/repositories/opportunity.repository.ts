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

    const [items, total, chainStats, featureStats] = await Promise.all([
      baseQuery
        .offset((page - 1) * limit)
        .limit(limit)
        .orderBy(sortField, sortDirection, 'NULLS LAST')
        .getMany(),

      baseQuery.getCount(),
      this.getChainStats(queryParams),
      this.getFeatureStats(queryParams),
    ]);

    return plainToClass(PaginationResult, {
      items,
      stats: {
        chains: chainStats,
        features: featureStats,
      },
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

  private internalFuzzyFind(fullSearch: string) {
    const searchItems = fullSearch.split(',').map((a) => a.trim().toLowerCase());

    const first = searchItems.shift();

    return new Brackets((query) => {
      query.where(this.searchForItem(first, 0));

      searchItems.forEach((item, idx) => {
        query.orWhere(this.searchForItem(item, idx + 1));
      });
    });
  }

  private searchForItem(search: string, index: number) {
    const exactSearch = search.toLowerCase();
    const fuzzySearch = `%${exactSearch}%`;

    const parameters = {
      [`farm_${index}`]: fuzzySearch,
      [`symbol_${index}`]: exactSearch,
      [`name_${index}`]: fuzzySearch,
      [`address_${index}`]: exactSearch,
      [`symbolJson_${index}_deposit`]: `[{"symbol": "${exactSearch}" }]`,
      [`nameJson_${index}_deposit`]: `[{"name": "${exactSearch}" }]`,
      [`addrJson_${index}_deposit`]: `[{"address": "${exactSearch}" }]`,
      [`symbolJson_${index}_reward`]: `[{"symbol": "${exactSearch}" }]`,
      [`nameJson_${index}_reward`]: `[{"name": "${exactSearch}" }]`,
      [`addrJson_${index}_reward`]: `[{"address": "${exactSearch}" }]`,
    };

    return new Brackets((query: SelectQueryBuilder<OpportunityEntity>) => {
      query
        .where(`farm.name ILIKE :farm_${index}`)
        // Deposit Token
        .orWhere(`opportunities.tokens::jsonb -> 'deposit' ->> 'symbol' ILIKE :symbol_${index}`)
        .orWhere(`opportunities.tokens::jsonb -> 'deposit' ->> 'name' ILIKE :name_${index}`)
        .orWhere(`opportunities.tokens::jsonb -> 'deposit' ->> 'address' ILIKE :address_${index}`)

        // Underlying deposit tokens
        .orWhere(
          `LOWER(opportunities.tokens::text)::jsonb->'deposit'->'tokens' @> LOWER(:symbolJson_${index}_deposit)::jsonb`,
        )
        .orWhere(
          `LOWER(opportunities.tokens::text)::jsonb->'deposit'->'tokens' @> LOWER(:nameJson_${index}_deposit)::jsonb`,
        )
        .orWhere(
          `LOWER(opportunities.tokens::text)::jsonb->'deposit'->'tokens' @> LOWER(:addrJson_${index}_deposit)::jsonb`,
        )
        // reward token
        .orWhere(
          `LOWER(opportunities.tokens::text)::jsonb->'rewards' @> LOWER(:symbolJson_${index}_reward)::jsonb`,
        )
        .orWhere(
          `LOWER(opportunities.tokens::text)::jsonb->'rewards' @> LOWER(:nameJson_${index}_reward)::jsonb`,
        )
        .orWhere(
          `LOWER(opportunities.tokens::text)::jsonb->'rewards' @> LOWER(:addrJson_${index}_reward)::jsonb`,
        )
        .setParameters(parameters);
    });
  }
  /**
   * Gets the list of chains & the number of pools on each chain
   */
  private async getChainStats(queryParams: OpportunitySearchQueryDto): Promise<IChainStats[]> {
    const { minTVL } = queryParams;
    return this.query(
      `
        SELECT COALESCE(MAX(count), 0)::int AS count, opportunities.chain_id
        FROM opportunities
          FULL JOIN (
            SELECT COUNT(DISTINCT id) AS count, x.chain_id
            FROM opportunities AS x
            WHERE x.total_value_locked > $1
            GROUP BY x.chain_id
          ) AS counts
          ON opportunities.chain_id = counts.chain_id
        GROUP BY opportunities.chain_id
      `,
      [minTVL],
    );
  }

  /**
   * Gets a list of the number of pools belonging to each feature
   */
  private async getFeatureStats(queryParams: OpportunitySearchQueryDto): Promise<IFeatureStats[]> {
    const { minTVL } = queryParams;
    return this.query(
      `
        SELECT COALESCE(MAX(counter), 0)::int AS count, opp.feature
        FROM opportunities
          CROSS JOIN LATERAL UNNEST(opportunities.categories) AS opp (feature)
          FULL JOIN (
            SELECT COUNT(feature) AS counter, feature
            FROM opportunities AS x
            CROSS JOIN LATERAL UNNEST(x.categories) AS feature
            WHERE total_value_locked > $1
            GROUP BY feature
          ) AS counts
          ON opp.feature = counts.feature
      GROUP BY opp.feature
      `,
      [minTVL],
    );
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
