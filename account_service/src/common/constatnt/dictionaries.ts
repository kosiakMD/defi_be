import { ChainSymbols } from '../enum';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from './index';

export const ChainIdToSymbol = {
  [CHAIN_ID_ETH]: ChainSymbols.eth,
  [CHAIN_ID_BSC]: ChainSymbols.bsc,
};
