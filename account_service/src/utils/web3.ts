import { Address } from '../common/interfaces';
import { Chain } from '../common/types';
import { CHAIN_ID_BSC, CHAIN_ID_ETH, ETH_BNB_ADDRESS } from './utils';

export const isBnbAddress = (address: Address): boolean => address === ETH_BNB_ADDRESS;

export const isEthChain = (chain: Chain): boolean => chain === CHAIN_ID_ETH;

export const isBscChain = (chain: Chain): boolean => chain === CHAIN_ID_BSC;
