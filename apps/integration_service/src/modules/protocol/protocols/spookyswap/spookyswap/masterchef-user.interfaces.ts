import { MasterchefBalance } from './masterchef-balance.interfaces';

export interface MasterchefUser {
  balances: MasterchefBalance[];
  id: string;
}
