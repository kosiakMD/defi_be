import { OpportunityInterface } from '@app/common/interfaces/Opportunity.interface';

export interface FarmInterface {
  name: string;
  url: string;
  isEnabled: boolean;
  opportunities: OpportunityInterface[];
}
