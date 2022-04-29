import BigNumber from 'bignumber.js';

import { normalizeDecimals } from '@app/common/utils';

import { IQuarryStakingFeatureMinimal } from './interfaces';

export function mapReserveResponse(reserves: any[]) {
  return new Map(
    reserves.map((reserve) => {
      const parsed = reserve?.result?.value?.data?.parsed?.info?.tokenAmount;
      if (parsed) {
        return [reserve.id, normalizeDecimals(parsed.amount, parsed.decimals)];
      }
    }),
  );
}
export function calculateAPR(
  opportunity: IQuarryStakingFeatureMinimal,
  tokens: Map<string, any>,
): number {
  const token = tokens.get(opportunity.supplied[0].token.address);
  return opportunity.rewarded
    .reduce((prev, next) => {
      const rewardPrice = tokens.get(next.token.address).price;
      const depositedTokenPrice = token.price;

      const annualRewardsRate = new BigNumber(opportunity.extra.annualRewardsRate.toString());
      const totalTokensDeposited = new BigNumber(opportunity.extra.totalTokensDeposited.toString());
      const annualPrice = annualRewardsRate.times(rewardPrice);
      const depositedPrice = totalTokensDeposited.times(depositedTokenPrice);

      return prev.plus(annualPrice.div(depositedPrice));
    }, new BigNumber(0))
    .toNumber();
}
