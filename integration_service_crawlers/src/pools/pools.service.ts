import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CACHE_MANAGER, Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseService } from '../jobs/db/database.service';
import { LiquidityPool } from '../store/dto/liquiditypool/liquiditypool.dto';
import { PoolsServicePancake } from './pools.service.pancake';
import { PoolsServiceSushiswap } from './pools.service.sushiswap';
import { PoolsServiceUniswap } from './pools.service.uniswap';

@Injectable()
export class PoolsService {
  private readonly cacheTTLInSeconds;

  constructor(
    private readonly poolsServiceUniswap: PoolsServiceUniswap,
    private readonly poolsServiceSushiswap: PoolsServiceSushiswap,
    private readonly poolsServicePancake: PoolsServicePancake,
    private databaseService: DatabaseService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.cacheTTLInSeconds = this.configService.get<number>('POOLS_CACHE_TTL_IN_SECONDS');
  }

  async savePools(): Promise<any> {
    try {
      const databaseClient = await this.databaseService.getClient();
      // add pools one by one to avoid subgraph overload:
      const pools: LiquidityPool[] = []
        .concat(await this.poolsServiceUniswap.getPoolsToHandle())
        .concat(await this.poolsServiceSushiswap.getPoolsToHandle())
        .concat(await this.poolsServicePancake.getCurrentPairs());

      const query = this.buildInsertPoolsQuery(pools);
      await databaseClient.query(query);
      this.logger.log(
        `liquidity pools import completed in total [${pools.length}]`,
        'PoolsService',
      );

      return pools;
    } catch (e) {
      this.logger.error(e, 'PoolsService');
      this.logger.log(`pools import failed`, 'PoolsService');
      return [];
    }
  }

  private buildInsertPoolsQuery(liquidityPools: LiquidityPool[]): string {
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
        lp.updatedAt = PoolsService.getUpdatedDate();
        return `(
				default, 
				'${lp.id}', 
				'${lp.chain}', 
				'${lp.project}',
				'${lp.reserveUSD}',
				'${JSON.stringify(lp.apy)}',
				'${JSON.stringify(lp.il)}',
				'${JSON.stringify(lp.token).replace(/'/gm, "''")}',
				'${JSON.stringify(lp.poolTokens).replace(/'/gm, "''")}',
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

  private static getUpdatedDate(): string {
    return new Date() //
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
  }
}
