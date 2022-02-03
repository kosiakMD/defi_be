import { toDecimals } from 'apps/account_service/src/common/utils';
import BN from 'bn.js';

import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

import { MAX_U64, ZERO } from '../saber.constant';
import { balance, quarryInfo } from '../saber.interface';

function calculateRewardPerTokem(quarryInfo: quarryInfo) {
  const currentTs = new BN(Math.round(new Date().getTime() / 1000));
  const rewardsPerTokenStored = new BN(quarryInfo.data.rewardsPerTokenStored);
  const lastTimeRewardsApplicable = BN.min(currentTs, new BN(quarryInfo.data.famineTs));
  const timeWorked = BN.max(
    ZERO,
    lastTimeRewardsApplicable.sub(new BN(quarryInfo.data.lastCheckpointTs)),
  );
  const reward = timeWorked
    .mul(MAX_U64)
    .mul(new BN(quarryInfo.data.annualRewardsRate))
    .div(new BN(365 * 86_400))
    .div(new BN(quarryInfo.data.totalTokensDeposited));
  return rewardsPerTokenStored.add(reward);
}

export function calculateReward(
  quarryInfos,
  balance: balance,
  vault: IntegrationStakingPositionDto,
) {
  const quarryInfo = quarryInfos.find((q) => q.data.tokenMintKey === vault.stakingToken.address);
  const rewardsPerTokenStored = calculateRewardPerTokem(quarryInfo);
  const netNewRewards = rewardsPerTokenStored.sub(new BN(balance.rewardsPerTokenPaid));
  const balanceMultiply = new BN(balance.balance).mul(netNewRewards);
  const earnedRewards = balanceMultiply.div(MAX_U64);

  const reward = earnedRewards.add(new BN(balance.rewardsEarned));
  return toDecimals(reward.toNumber(), vault.rewards[0].decimals);
}
