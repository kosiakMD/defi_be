import { FarmInterface } from './Farm.Interface';
import { InvestmentTokenInterface } from './investment.token.interface';

export interface OpportunityInterface {
  farm: FarmInterface;
  chainId: number;
  apr: number;
  apy: number;
  investmentUrl: string;
  totalValueLocked: number;
  tokens: InvestmentTokenInterface;
}
