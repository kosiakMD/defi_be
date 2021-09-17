import { CHAIN_ID_BSC, CHAIN_ID_ETH, ETH_BNB_ADDRESS } from '@app/common/constatnt';
import { Address } from '@app/common/types';
import { ChainId } from '@app/common/types';

export const isEthChain = (chain: ChainId): boolean => chain === CHAIN_ID_ETH;

export const isBscChain = (chain: ChainId): boolean => chain === CHAIN_ID_BSC;

export const isBnbAddress = (address: Address): boolean => address === ETH_BNB_ADDRESS;
