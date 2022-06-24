import type { AbiItem } from 'web3-utils';

import type { Address, ChainId } from '@app/common';

export interface AbiSource {
  fetchAbi(address: Address, chain: ChainId): Promise<AbiItem[] | void>;
}
