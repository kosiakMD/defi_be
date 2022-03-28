import { FarmInterface } from '@app/common/interfaces/Farm.Interface';
import { InvestmentTokenInterface } from '@app/common/interfaces/investment.token.interface';

export interface OpportunityInterface {
  farm: FarmInterface;
  chainId: number;
  apr: number;
  apy: number;
  investmentUrl: string;
  totalValueLocked: number;
  tokens: InvestmentTokenInterface;
}
