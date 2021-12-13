import { IAaveGenericToken } from 'jobs/lambda_protocol_prices/src/thegraph/aave/interfaces';

import { ChainIdEnum } from '@app/common';

export const ADDITIONAL_TOKENS: Partial<Record<ChainIdEnum, IAaveGenericToken[]>> = {
  [ChainIdEnum.eth]: [
    {
      // stkAave => aave
      underlyingAssetAddress: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
      id: '0x4da27a545c0c5B758a6BA100e3a049001de870f5',
    },
  ],
};
