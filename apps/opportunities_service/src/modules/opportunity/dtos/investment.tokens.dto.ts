import { InvestmentTokenInterface } from '@app/common/interfaces/investment.token.interface';

import { DepositTokenDto } from './deposit.token.dto';
import { RewardTokenDto } from './reward.token.dto';

export class InvestmentTokensDto implements InvestmentTokenInterface {
  rewards: RewardTokenDto[] = []; // most auto-compounders have no 'reward tokens'
  deposit: DepositTokenDto;
}
