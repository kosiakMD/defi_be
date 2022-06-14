import { AceLabBalance } from './acelab.balance.interfaces';

export interface AceLabUser {
  balances: AceLabBalance[];
  id: string;
}
