import { DepositTokenInterface } from './deposit.token.interface';
import { RewardTokenInterface } from './reward.token.interface';

export interface InvestmentTokenInterface {
  rewards: RewardTokenInterface[]; // most auto-compounders have no 'reward tokens'
  deposit: DepositTokenInterface;
}
