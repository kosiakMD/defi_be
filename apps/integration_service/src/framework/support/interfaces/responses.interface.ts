import { IPlatformMeta, IPlatformUserEntry, IWalletOpportunity } from '../interfaces';

export interface StandardResponse<T> {
  errors: string[];
  data: T;
}

export type IOpportunityResponse = StandardResponse<{
  protocol: IPlatformMeta;
  items: IWalletOpportunity[];
}>;

export type IUserEntryResponse = StandardResponse<{
  protocol: IPlatformMeta;
  total: number;
  wallets: IPlatformUserEntry[];
}>;
