import { LiquidityPoolsEntity } from '../../store/entities/liquiditypools.entity';
import { Pair } from '../../thegraph/uniswap/pair.interface';

export function poolsToPairs(pools: LiquidityPoolsEntity[]): Pair[] {
  return pools.reduce((reduced, pool) => {
    const token0 = pool.poolTokens.find((p) => p.positionInPool === 0);
    const token1 = pool.poolTokens.find((p) => p.positionInPool === 1);
    return [
      ...reduced,
      {
        id: pool.address,
        token0: token0,
        token1: token1,
        reserve0: token0.reserve,
        reserve1: token1.reserve,
        totalSupply: pool.token.totalSupply,
        reserveUSD: pool.reserveUsd,
      },
    ];
  }, []);
}
