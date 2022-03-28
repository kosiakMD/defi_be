import { Address } from '@app/common';

import { BlockTimestamp } from '../../modules/balances/balances.interfaces';

export * from 'winston-aws-cloudwatch';

export type CurrencyId = number;

export type Timestamp = string;

export type BalancesRequest = {
  address: Address;
  chainId: number;
  tokens: Address[];
  block?: BlockTimestamp;
};
