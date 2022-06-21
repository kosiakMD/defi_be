import { Address } from '@app/common';

import { BlockTimestamp } from '../services/blocktime.service';

export type BalancesRequest = {
  address: Address;
  chainId: number;
  tokens: Address[];
  block?: BlockTimestamp;
};
