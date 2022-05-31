import BigNumber from 'bignumber.js';

import { ChainIdEnum } from '@app/common';

export const RAY = new BigNumber(10).pow(27);

export const LendingPool = new Map([
  [ChainIdEnum.eth, '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9'],
  [ChainIdEnum.plg, '0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf'],
  [ChainIdEnum.avax, '0x4F01AeD16D97E3aB5ab2B501154DC9bb0F1A5A2C'],
]);

export const IncentivesController = new Map([
  [ChainIdEnum.eth, '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5'],
  [ChainIdEnum.plg, '0x357D51124f59836DeD84c8a1730D72B749d8BC23'],
  [ChainIdEnum.avax, '0x01D83Fe6A10D2f2B7AF17034343746188272cAc9'],
]);
