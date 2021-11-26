export function calculateAPR({
  totalAllocPoints,
  poolAllocPoints,
  rewardTokenPerBlock,
  rewardTokenPrice,
  blockTime,
  farmingPoolTVL,
}): number {
  const poolRewardPerBlock = poolAllocPoints
    .div(totalAllocPoints)
    .times(rewardTokenPerBlock)
    .times(rewardTokenPrice);
  const aprPerBlock = poolRewardPerBlock.div(farmingPoolTVL).toNumber() * 100;
  const blocksPerYear = (86400 * 365) / blockTime;
  return aprPerBlock * blocksPerYear;
}

export function calculateAPRBonus({
  rewardTokenPerBlock,
  rewardTokenPrice,
  blockTime,
  farmingPoolTVL,
}): number {
  const poolRewardPerBlock = rewardTokenPerBlock * rewardTokenPrice;
  const aprPerBlock = (poolRewardPerBlock / farmingPoolTVL) * 100;
  const blocksPerYear = (86400 * 365) / blockTime;
  return aprPerBlock * blocksPerYear;
}
