import { Address, ChainIdEnum } from '@app/common';

import { BlockTimestamp } from '../../modules/balances/balances.interfaces';

export * from 'winston-aws-cloudwatch';

export type ChainId = ChainIdEnum;

export type CurrencyId = number;

export type Timestamp = string;

export type BalancesRequest = {
  address: Address;
  chainId: ChainIdEnum;
  tokens: Address[];
  block?: BlockTimestamp;
};
