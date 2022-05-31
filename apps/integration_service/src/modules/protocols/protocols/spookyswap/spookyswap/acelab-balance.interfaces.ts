import { AceLabUser } from './acelab-user.interfaces';

export interface AceLabBalance {
  id: string;
  poolId: string;
  reward: string;
  balance: string;
  user: AceLabUser;
}
