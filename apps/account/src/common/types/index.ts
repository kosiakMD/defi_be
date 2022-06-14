import { Address } from '@app/common';

import { BlockTimestamp } from '../../modules/balances/balances.interfaces';

export type BalancesRequest = {
  address: Address;
  chainId: number;
  tokens: Address[];
  block?: BlockTimestamp;
};
