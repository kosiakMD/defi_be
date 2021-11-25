import { CHAIN_ID_ETH } from '@app/common/constant';
import { ChainId } from '@app/common/types';

export const isEthChain = (chain: ChainId): boolean => chain === CHAIN_ID_ETH;
