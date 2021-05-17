import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { LiquidityPool } from './dto/liquiditypool/liquiditypool.dto';
import { LiquidityPoolsEntity } from './entities/liquiditypools.entity';
import { LiquidityPoolsRepository } from './repositories/liquiditypools.repository';

@Injectable()
export class LiquidityPoolsStore {
  constructor(
    @InjectRepository(LiquidityPoolsEntity)
    private readonly liquidityPoolsRepository: LiquidityPoolsRepository,
  ) {}

  async getProjectPools(project: string): Promise<LiquidityPoolsEntity[]> {
    return this.liquidityPoolsRepository.find({ where: { project: project } });
  }

  async insertEntitiesBulk(liquidityPools: LiquidityPoolsEntity[]) {
    const insertQuery = this.buildInsertPoolsEntitiesQuery(liquidityPools);
    await this.liquidityPoolsRepository.query(insertQuery);
  }

  async insertBulk(liquidityPools: LiquidityPool[]) {
    const insertQuery = this.buildInsertPoolsQuery(liquidityPools);
    await this.liquidityPoolsRepository.query(insertQuery);
  }

  buildInsertPoolsEntitiesQuery(liquidityPools: LiquidityPoolsEntity[]): string {
    const queryStart = `
        INSERT INTO liquidity_pools
        (id,
         address,
         chain,
         project,
         reserve_usd,
         apy,
         il,
         token,
         pool_tokens,
         created_at,
         updated_at)
        VALUES`;

    const valuesConcatenated = liquidityPools
      .map((lp) => {
        return `(
				default, 
				'${lp.token.id}', 
				'${lp.chain}', 
				'${lp.project}',
				'${lp.reserveUsd.toString()}',
				'${JSON.stringify(lp.apy)}',
				'${JSON.stringify(lp.il)}',
				'${JSON.stringify(lp.token).replace("'", "''")}',
				'${JSON.stringify(lp.poolTokens).replace("'", "''")}',
				current_timestamp,
				current_timestamp
				)`;
      })
      .join(',');

    const queryEnd = `
			on conflict (chain, address) do update
			set address = excluded.address,
					chain = excluded.chain,
					project = excluded.project,
					reserve_usd = excluded.reserve_usd,
					apy = excluded.apy,
					il = excluded.il,
					token = excluded.token,
					pool_tokens = excluded.pool_tokens,
					updated_at = current_timestamp
		`;
    return queryStart.concat(valuesConcatenated).concat(queryEnd);
  }

  buildInsertPoolsQuery(liquidityPools: LiquidityPool[]): string {
    const queryStart = `
        INSERT INTO liquidity_pools
        (id,
         address,
         chain,
         project,
         reserve_usd,
         apy,
         il,
         token,
         pool_tokens,
         created_at,
         updated_at)
        VALUES`;

    const valuesConcatenated = liquidityPools
      .map((lp) => {
        return `(
				default, 
				'${lp.id}', 
				'${lp.chain}', 
				'${lp.project}',
				'${lp.reserveUSD}',
				'${JSON.stringify(lp.apy)}',
				'${JSON.stringify(lp.il)}',
				'${JSON.stringify(lp.poolToken).replace("'", "''")}',
				'${JSON.stringify(lp.tokens).replace("'", "''")}',
				current_timestamp,
				current_timestamp
				)`;
      })
      .join(',');

    const queryEnd = `
			on conflict (chain, address) do update
			set address = excluded.address,
					chain = excluded.chain,
					project = excluded.project,
					reserve_usd = excluded.reserve_usd,
					apy = excluded.apy,
					il = excluded.il,
					token = excluded.token,
					pool_tokens = excluded.pool_tokens,
					updated_at = current_timestamp
		`;
    return queryStart.concat(valuesConcatenated).concat(queryEnd);
  }
}
