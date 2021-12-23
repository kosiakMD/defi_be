import { Address, ChainIdEnum } from '@app/common';

import { BlockTimestamp } from '../../modules/balances/balances.interfaces';

export type BalancesRequest = {
  address: Address;
  chainId: ChainIdEnum;
  tokens: Address[];
  block?: BlockTimestamp;
};
