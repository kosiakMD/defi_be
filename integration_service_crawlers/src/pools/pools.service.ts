import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { DatabaseService } from '../jobs/db/database.service';
import { LiquidityPool } from './dto/liquiditypool.dto';
import { PoolsServiceBalancer } from './pools.service.balancer';
import { PoolsServiceCurve } from './pools.service.curve';
import { PoolsServicePancake } from './pools.service.pancake';
import { PoolsServiceSushiswap } from './pools.service.sushiswap';
import { PoolsServiceUniswap } from './pools.service.uniswap';

@Injectable()
export class PoolsService {
  constructor(
    private readonly poolsServiceUniswap: PoolsServiceUniswap,
    private readonly poolsServiceSushiswap: PoolsServiceSushiswap,
    private readonly poolsServicePancake: PoolsServicePancake,
    private readonly poolsServiceBalancer: PoolsServiceBalancer,
    private readonly poolsServiceCurve: PoolsServiceCurve,
    private databaseService: DatabaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {}

  async savePools(): Promise<any> {
    try {
      const databaseClient = await this.databaseService.getClient();
      // add pools one by one to avoid subgraph overload:
      const pools: LiquidityPool[] = []
        .concat(await this.poolsServiceUniswap.getPoolsToHandle())
        .concat(await this.poolsServiceSushiswap.getPoolsToHandle())
        .concat(await this.poolsServicePancake.getPoolsToHandle());

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

  buildInsertPoolsQuery(liquidityPools: LiquidityPool[]): string {
    const queryStart = `
        INSERT INTO public.liquidity_pools
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
