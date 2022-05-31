import { MasterchefUser } from './masterchef-user.interfaces';

export interface MasterchefBalance {
  id: string;
  poolId: string;
  staked: string; // staked token
  balance: string;
  user: MasterchefUser;
}
