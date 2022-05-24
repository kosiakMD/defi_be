import BN from 'bn.js';

export class Payroll {
  famineTs: BN;
  lastUpdateTs: BN;
  annualRewardsRate: BN;
  rewardsPerTokenStored: BN;
  totalTokensDeposited: BN;
  ZERO: BN;
  MAX_U64: BN;

  constructor(
    famineTs: string,
    lastUpdateTs: string,
    annualRewardsRate: string,
    rewardsPerTokenStored: string,
    totalTokensDeposited: string,
  ) {
    this.famineTs = new BN(famineTs);
    this.lastUpdateTs = new BN(lastUpdateTs);
    this.annualRewardsRate = new BN(annualRewardsRate);
    this.rewardsPerTokenStored = new BN(rewardsPerTokenStored);
    this.totalTokensDeposited = new BN(totalTokensDeposited);

    this.ZERO = new BN(0);
    this.MAX_U64 = new BN('ffffffffffffffff', 16);
  }

  calculateRewardPerToken(currentTs: BN) {
    if (this.totalTokensDeposited.isZero()) {
      return this.rewardsPerTokenStored;
    }

    const lastTimeRewardsApplicable = BN.min(currentTs, this.famineTs);
    const timeWorked = BN.max(this.ZERO, lastTimeRewardsApplicable.sub(this.lastUpdateTs));
    const reward = timeWorked
      .mul(this.MAX_U64)
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
    const earnedRewards = tokensDeposited.mul(netNewRewards).div(this.MAX_U64);
    return earnedRewards.add(rewardsEarned);
  }
}
