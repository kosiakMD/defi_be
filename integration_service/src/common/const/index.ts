import { ChainAbbrEnum } from '../enum';

export const CHAIN_ETH = 'eth';
export const CHAIN_ID_ETH = 1;
export const CHAIN_BSC = 'bsc';
export const CHAIN_ID_BSC = 2;

export const ChainIdToAbbr = {
  [CHAIN_ID_ETH]: ChainAbbrEnum.eth,
  [CHAIN_ID_BSC]: ChainAbbrEnum.bsc,
};
