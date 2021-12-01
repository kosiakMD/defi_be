// eslint-disable-next-line max-classes-per-file
import BigNumber from 'bignumber.js';

export class APRStats {
  totalAllocPoints: BigNumber;
  poolAllocPoints: BigNumber;
  rewardTokenPerBlock: number;
  rewardTokenPrice: number;
  blockTime: number;
  farmingPoolTVL: number;
}

export class APRStatsBonus {
  rewardTokenPerBlock: number;
  rewardTokenPrice: number;
  blockTime: number;
  farmingPoolTVL: number;
}
