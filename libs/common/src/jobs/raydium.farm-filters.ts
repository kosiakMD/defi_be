import { RaydiumFarm } from './raydium.farm';

export const FARM_FILTERS_V3 = (address: string) => [
  {
    memcmp: {
      offset: 40,
      bytes: address,
    },
  },
  {
    dataSize: RaydiumFarm.version3.userInfoLayout.span,
  },
];

export const FARM_FILTERS_V3_1 = (address: string) => [
  {
    memcmp: {
      offset: 40,
      bytes: address,
    },
  },
  {
    dataSize: RaydiumFarm.version31.userInfoLayout.span,
  },
];

export const FARM_FILTERS_V4 = (address: string) => [
  {
    memcmp: {
      offset: 40,
      bytes: address,
    },
  },
  {
    dataSize: RaydiumFarm.version4.userInfoLayout.span,
  },
];

export const FARM_FILTERS_V5 = (address: string) => [
  {
    memcmp: {
      offset: 40,
      bytes: address,
    },
  },
];
