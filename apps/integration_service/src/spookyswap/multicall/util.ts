import { JsonFragment } from '@ethersproject/abi';

import { ChainIdEnum } from '@app/common';

import {
  SPOOKYSWAP_ACELAB_MASTERCHEF_ABI,
  SPOOKYSWAP_FARM_MASTERCHEF_ABI,
  SPOOKYSWAP_XBOO_ABI,
} from '../abi';

export const farmsMap: Map<number, string> = new Map([
  [ChainIdEnum.ftm, '0x2b2929E785374c651a81A63878Ab22742656DcDd'],
]);
export const acelabMap: Map<number, string> = new Map([
  [ChainIdEnum.ftm, '0x2352b745561e7e6FCD03c093cE7220e3e126ace0'],
]);

export const booMap: Map<ChainIdEnum, string> = new Map([
  [ChainIdEnum.ftm, '0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE'],
]);
export const xBooMap: Map<ChainIdEnum, string> = new Map([
  [ChainIdEnum.ftm, '0xa48d959AE2E88f1dAA7D5F611E01908106dE7598'],
]);

export const farmAbis: Map<ChainIdEnum, JsonFragment[]> = new Map([
  [ChainIdEnum.ftm, SPOOKYSWAP_FARM_MASTERCHEF_ABI],
]);

export const xBooAbis: Map<ChainIdEnum, JsonFragment[]> = new Map([
  [ChainIdEnum.ftm, SPOOKYSWAP_XBOO_ABI],
]);

export const acelabAbis: Map<ChainIdEnum, JsonFragment[]> = new Map([
  [ChainIdEnum.ftm, SPOOKYSWAP_ACELAB_MASTERCHEF_ABI],
]);
