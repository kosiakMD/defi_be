import { CurrentPricesPayload } from '@app/common';
import { PoolTokenDto } from '@app/common/jobs/pools';
import { IntegrationPoolTokenDto, UnderlyingStakingLp } from '@app/common/jobs/staking';
import { calcTokenPrice } from '@app/common/utils/price';

import { toDecimals } from '../../utils/number';

export function fillUnderlyingTokens(
  tokens: (IntegrationPoolTokenDto | UnderlyingStakingLp | PoolTokenDto)[],
  reserves: number[],
  prices: Map<string, string> | CurrentPricesPayload,
  poolShare?: number,
) {
  tokens.forEach((t) => {
    reserves[t.positionInPool] = toDecimals(reserves[t.positionInPool], t.decimals);
  });

  return tokens.reduce((tvl, t, i) => {
    t.reserve = reserves[t.positionInPool];

    // if we are not able to get price from price service, we try to calculate it by using the price of the neighbourhood token
    t.price =
      Number(prices[t.address]) === 0
        ? calcTokenPrice(
            reserves,
            t.positionInPool,
            prices[tokens[(i + 1) % 2].address]?.toString(),
          )
        : Number(prices[t.address]);
    t.balance = poolShare ? t.reserve * poolShare : t.reserve;
    t.value = t.balance * t.price;

    return tvl + t.value;
  }, 0);
}
