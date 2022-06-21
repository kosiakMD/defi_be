import BigNumber from 'bignumber.js';

import { Address } from '@app/common';

import { IProtocolMeta } from '../../../interfaces';

interface IOccamXToken {
  name: string;
  contract: string;
  decimals: number;
}

export interface IOccamXPool {
  liquidity_token: IOccamXToken;
  token_0: IOccamXToken;
  token_1: IOccamXToken;
  tvl: string;
  volume_24: string;
  price_lt: string;
  total_supply: string;
}

export interface IOccamXPoolsResponse {
  pools: IOccamXPool[];
}

export interface IOccamXProtocolMeta extends IProtocolMeta {
  api: {
    endpoint: string;
    path: string;
    handler?: (data: unknown) => Address[];
  };
  context: {
    endpoint: {
      allPools: string;
      subgraph: string;
    };
  };
}

export interface IGetReservesData {
  _reserve0: BigNumber;
  _reserve1: BigNumber;
}
