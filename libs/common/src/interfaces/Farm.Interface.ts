import { OpportunityInterface } from './Opportunity.interface';

export interface FarmInterface {
  name: string;
  url: string;
  isEnabled: boolean;
  opportunities: OpportunityInterface[];
}
