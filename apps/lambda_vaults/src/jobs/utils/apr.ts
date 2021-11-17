import { APRStats, APRStatsBonus } from '../dto/apr';

export function calculateAPR({
  totalAllocPoints,
  poolAllocPoints,
  rewardTokenPerBlock,
  rewardTokenPrice,
  blockTime,
  farmingPoolTVL,
}: APRStats): number {
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
}: APRStatsBonus): number {
  const poolRewardPerBlock = rewardTokenPerBlock * rewardTokenPrice;
  const aprPerBlock = (poolRewardPerBlock / farmingPoolTVL) * 100;
  const blocksPerYear = (86400 * 365) / blockTime;
  return aprPerBlock * blocksPerYear;
}
