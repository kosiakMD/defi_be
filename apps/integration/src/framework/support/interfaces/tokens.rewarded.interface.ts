import { IRewardRates } from './rewards.interface';
import { ITokenMinimal, ITokenOpportunity, ITokenUserEntry } from './tokens.common.interface';

export interface IRewardTokenMinimal<TExtra = unknown> extends ITokenMinimal<TExtra> {
  // TODO: move to extras on masterchef
  rewardPerSecond?: string;

  // TODO: move to 'extras' in lending interfaces on integrations that use this
  // to connect later rewards with what they are awarded for
  rewardedForTokenAddress?: string;
  rewardedForLendingSide?: 'supplied' | 'borrowed';
}
export interface IRewardTokenOpportunity<TExtra = unknown> extends ITokenOpportunity<TExtra> {
  // TODO: discuss: remove harvests & apy => only apr is used, and would simplify things
  harvests?: IRewardRates; // number of harvestable tokens per time period
  apr: IRewardRates; // calculated APR based on emission rate & current token price
  apy: IRewardRates; // estimated APY based on APR compounded daily
  aprMax?: IRewardRates; // max rates for pools with boost
  apyMax?: IRewardRates; // max rates for pools with boost

  // TODO: move to 'extras' in lending interfaces on integrations that use this
  // to connect later rewards with what they are awarded for
  rewardedForTokenAddress?: string;
  rewardedForLendingSide?: 'supplied' | 'borrowed';
}

export interface IRewardTokenUserEntry<TExtra = unknown> extends ITokenUserEntry<TExtra> {
  // TODO: discuss: remove harvests & apy => only apr is used, and would simplify things
  harvests?: IRewardRates; // number of harvestable tokens per time period
  apr: IRewardRates; // calculated APR based on emission rate & current token price
  apy: IRewardRates; // estimated APY based on APR compounded daily

  // TODO: move to 'extras' in lending interfaces on integrations that use this
  rewardedForTokenAddress?: string;
  rewardedForLendingSide?: 'supplied' | 'borrowed';
}
