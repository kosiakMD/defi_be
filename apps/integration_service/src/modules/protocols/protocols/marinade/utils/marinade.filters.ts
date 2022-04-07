import type { PublicKey } from '@solana/web3.js';

import {
  QUARRY_MERGE_POOL_LAYOUT,
  QUARRY_MERGE_MINER_LAYOUT,
  QUARRY_MINER_LAYOUT,
  QUARRY_MINT_WRAPPER_LAYOUT,
  QUARRY_REDEEMER_LAYOUT,
} from './marinade.layouts';

export const quarryMergePoolFilters = [
  {
    dataSize: QUARRY_MERGE_POOL_LAYOUT.span,
  },
];

export const quarryMintWrapperFilters = [
  {
    dataSize: QUARRY_MINT_WRAPPER_LAYOUT.span,
  },
];

export const quarryReedemerFilters = [
  {
    dataSize: QUARRY_REDEEMER_LAYOUT.span,
  },
];

export const quarryMergeMinerFilters = (userAddress: PublicKey) => [
  {
    memcmp: {
      offset: QUARRY_MERGE_MINER_LAYOUT.offsetOf('owner'),
      bytes: userAddress.toString(),
    },
  },
  { dataSize: QUARRY_MERGE_MINER_LAYOUT.span },
];

export const quarryMinerFilters = (userAddress: PublicKey) => [
  {
    memcmp: {
      offset: QUARRY_MINER_LAYOUT.offsetOf('owner'),
      bytes: userAddress.toString(),
    },
  },
  { dataSize: QUARRY_MINER_LAYOUT.span },
];
