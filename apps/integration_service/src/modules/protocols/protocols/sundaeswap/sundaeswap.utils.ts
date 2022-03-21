import { toDecimals } from 'apps/integration_service/src/common/utils/util';
import BigNumber from 'bignumber.js';

import { BalancesResponse } from '@app/common';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { Pool } from './sundaeswap.interface';

export function mapTokens(
  poolPosition: LiquidityPoolFeature,
  pool: Pick<Pool, 'quantityA' | 'quantityB'>,
): PoolTokenDto[] {
  return poolPosition.tokens.map((token, index) => {
    const quantity = index ? pool.quantityB : pool.quantityA;

    token.reserve = toDecimals(quantity, token.decimals);
    token.balance = token.reserve * poolPosition.stats.share;
    token.value = token.balance * token.price;

    delete token.totalSupply;
    delete token.tokens;
    delete token.weight;
    delete token.positionInPool;

    return token;
  });
}

export function getPoolAddresseAmount(
  addresses: string[],
  lpBalances: BalancesResponse,
  cache: string[],
): Map<string, string> {
  const pools = new Map<string, string>();
  const poolsMap = new Map<string, string>(
    cache.map((address) => [address.replace(/\./, ''), address]),
  );

  for (const address of addresses) {
    lpBalances[address].tokens.map(({ token, amount }) => {
      if (poolsMap.has(token.address)) {
        pools.set(poolsMap.get(token.address), amount);
      }
    });
  }
  return pools;
}

export function calculatePoolShare(
  walletBalance: number,
  poolPosition: LiquidityPoolFeature,
): number {
  const totalSupply: number = poolPosition.lpToken.totalSupply;
  const balance = toDecimals(walletBalance, poolPosition.lpToken.decimals);

  return new BigNumber(balance / totalSupply).toNumber();
}

export function cleanUpItem(item: IntegrationStakingPositionDto) {
  delete item.staked;
  delete item.stats;
  delete item.extra;
  // fields from NotifyPools
  delete item['lpToken'];
  delete item['statistic'];
  delete item['tokens'];

  return item;
}
