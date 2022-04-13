import BN from 'bn.js';

const MAX_U64 = new BN('ffffffffffffffff', 16);
const ZERO = new BN(0);

export class Payroll {
  famineTs: BN;
  lastCheckpointTs: BN;
  annualRewardsRate: BN;
  rewardsPerTokenStored: BN;
  totalTokensDeposited: BN;

  constructor(
    famineTs: BN,
    lastCheckpointTs: BN,
    annualRewardsRate: BN,
    rewardsPerTokenStored: BN,
    totalTokensDeposited: BN,
  ) {
    this.famineTs = famineTs;
    this.lastCheckpointTs = lastCheckpointTs;
    this.annualRewardsRate = annualRewardsRate;
    this.rewardsPerTokenStored = rewardsPerTokenStored;
    this.totalTokensDeposited = totalTokensDeposited;
  }

  calculateRewardPerToken(currentTs: BN) {
    if (this.totalTokensDeposited.isZero()) {
      return this.rewardsPerTokenStored;
    }

    const lastTimeRewardsApplicable = BN.min(currentTs, this.famineTs);
    const timeWorked = BN.max(ZERO, lastTimeRewardsApplicable.sub(this.lastCheckpointTs));
    const reward = timeWorked
      .mul(MAX_U64)
      .mul(this.annualRewardsRate)
      .div(new BN(365 * 86400))
      .div(this.totalTokensDeposited);
    return this.rewardsPerTokenStored.add(reward);
  }

  calculateRewardsEarned(
    currentTs: BN,
    tokensDeposited: BN,
    rewardsPerTokenPaid: BN,
    rewardsEarned: BN,
  ) {
    const netNewRewards = this.calculateRewardPerToken(currentTs).sub(rewardsPerTokenPaid);
    const earnedRewards = tokensDeposited.mul(netNewRewards).div(MAX_U64);
    return earnedRewards.add(rewardsEarned);
  }
}
