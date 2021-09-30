import { ChainSymbols } from '../enum';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from './index';

export const ChainIdToAbbr = {
  [CHAIN_ID_ETH]: ChainSymbols.eth,
  [CHAIN_ID_BSC]: ChainSymbols.bsc,
};
