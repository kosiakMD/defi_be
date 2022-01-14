import BigNumber from 'bignumber.js';

export function calculateAPY({
  totalAllocPoints,
  poolAllocPoints,
  rewardTokenPerBlock,
  rewardTokenPrice,
  blockTime,
  farmingPoolTVL,
}): BigNumber {
  const poolRewardPerBlock = poolAllocPoints
    .div(totalAllocPoints)
    .times(rewardTokenPerBlock)
    .times(rewardTokenPrice);
  const blocksPerDay = 86400 / blockTime;
  const rewardPerDay = poolRewardPerBlock.multipliedBy(blocksPerDay);

  return (((rewardPerDay).div(farmingPoolTVL) //
    .plus(1))
    .pow(365)
    .minus(1))
    .multipliedBy(100);
}
