import { DepositTokenInterface } from '@app/common/interfaces/deposit.token.interface';
import { RewardTokenInterface } from '@app/common/interfaces/reward.token.interface';

export interface InvestmentTokenInterface {
  rewards: RewardTokenInterface[]; // most auto-compounders have no 'reward tokens'
  deposit: DepositTokenInterface;
}
