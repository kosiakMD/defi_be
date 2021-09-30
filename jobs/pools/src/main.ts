import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { LiquidityPoolJob } from './liquiditypool/liquidity.pool.job';
import { LiquidityPoolModule } from './liquiditypool/liquidity.pool.module';
import { StakingPoolJob } from './liquiditypool/staking.pool.job';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const poolsJob = app.select(LiquidityPoolModule).get(LiquidityPoolJob);
  await poolsJob.collectProtocolsAvailable();
  const stakingPoolJob = app.select(LiquidityPoolModule).get(StakingPoolJob);
  await stakingPoolJob.collectProtocolsAvailable();
  await app.close();
}
bootstrap();
