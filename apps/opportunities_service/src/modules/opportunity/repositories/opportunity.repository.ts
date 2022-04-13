import { plainToClass } from 'class-transformer';
import { EntityRepository, Repository, SelectQueryBuilder } from 'typeorm';

import { InjectRepository } from '@nestjs/typeorm';

import { PaginationResult } from '@app/common/dto/PaginationResult.dto';
import { OpportunitySearchQueryDto } from '@app/common/dto/opportunities/OpportunitySearchQuery.dto';
import { OpportunityCreateDto } from '@app/common/dto/opportunities/opportunity.create.dto';
import { chunk } from '@app/common/utils';

import { FarmEntity } from '../entities/farm.entity';
import { OpportunityEntity } from '../entities/opportunity.entity';
import { FarmRepository } from './farm.repository';

@EntityRepository(OpportunityEntity)
export class OpportunityRepository extends Repository<OpportunityEntity> {
  constructor(@InjectRepository(FarmEntity) private readonly farmRepository: FarmRepository) {
    super();
  }

  /**
   * Search, Sort, and Filter opportunities
   *
   * Searchable Fields:
   * - farm name
   * - deposit token address/name/symbol
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
    const { search, limit, page, sortDirection, sortField } = queryParams;

    // TODO:
    // Filter by min/max tvl, chain, farm
    // Search reward token names
    // Search underlying tokens if deposit token is an LP
    // search for single-tokens, lp deposits containing that token, search by reward token

    const baseQuery = this.createQueryBuilder('opportunities')
      .leftJoinAndSelect('opportunities.farm', 'farm')
      .where(this.internalFuzzyFind(search));

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

  private internalFuzzyFind(search: string) {
    const exactSearch = search.toLowerCase();
    const fuzzySearch = `%${search}%`.toLowerCase();

    return function (query: SelectQueryBuilder<OpportunityEntity>) {
      query
        .where('farm.name ILIKE :farm', { farm: fuzzySearch })
        .orWhere("opportunities.tokens ::jsonb -> 'deposit' ->> 'symbol' ILIKE :depositSymbol", {
          depositSymbol: exactSearch,
        })
        .orWhere("opportunities.tokens ::jsonb -> 'deposit' ->> 'name' ILIKE :depositName", {
          depositName: fuzzySearch,
        })
        .orWhere("opportunities.tokens ::jsonb -> 'deposit' ->> 'address' ILIKE :depositAddr", {
          depositAddr: exactSearch,
        });
      // TODO: Underlying deposit tokens & reward tokens
    };
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
