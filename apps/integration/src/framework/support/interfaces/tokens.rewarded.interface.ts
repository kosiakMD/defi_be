import { IRewardRates } from './rewards.interface';
import { ITokenMinimal, ITokenOpportunity, ITokenUserEntry } from './tokens.common.interface';

export interface IRewardTokenMinimal<TExtra = unknown> extends ITokenMinimal<TExtra> {
  // TODO: Discuss: should this be 'rate' and time frame block/second/year
  // or should this be standardized somehow i.e. 'perSecond'
  // always perSecond sounds nice, but there are instances where thats difficult
  // some chains don't have reliable block times, and often display rewards per second, but others
  // have much more reliable times and return results perBlock. this means that processing/normalizing
  // will have to be done per chain, and i'm not sure how awkward that will get. Also some such as the
  // Beefy API will give rates in yearly amounts, so we will need to fetch that, math it back to
  // per second to fit here, then calculate the yearly again later (when we already had this number
  // to begin with)
  // i.e.
  // { rate: 123456, type: block | second | yearly }
  // { rewardPerSecond: 123456 }

  rewardPerSecond?: string;
  // to connect later rewards with what they are awarded for
  rewardedForTokenAddress?: string;
  rewardedForLendingSide?: 'supplied' | 'borrowed';
}
export interface IRewardTokenOpportunity<TExtra = unknown> extends ITokenOpportunity<TExtra> {
  harvests?: IRewardRates; // number of harvestable tokens per time period
  apr: IRewardRates; // calculated APR based on emission rate & current token price
  apy: IRewardRates; // estimated APY based on APR compounded daily
  aprMax?: IRewardRates; // max rates for pools with boost
  apyMax?: IRewardRates; // max rates for pools with boost
  // to connect later rewards with what they are awarded for
  rewardedForTokenAddress?: string;
  rewardedForLendingSide?: 'supplied' | 'borrowed';
}

export interface IRewardTokenUserEntry<TExtra = unknown> extends ITokenUserEntry<TExtra> {
  // TODO: lockPolicy: null | vested | locked
  harvests?: IRewardRates; // number of harvestable tokens per time period
  apr: IRewardRates; // calculated APR based on emission rate & current token price
  apy: IRewardRates; // estimated APY based on APR compounded daily
  rewardedForTokenAddress?: string;
  rewardedForLendingSide?: 'supplied' | 'borrowed';
}
