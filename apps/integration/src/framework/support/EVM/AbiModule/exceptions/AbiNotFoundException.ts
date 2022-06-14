import { Address, ChainId } from '@app/common';

export class AbiNotFoundException extends Error {
  constructor(chain: ChainId, address: Address) {
    super(`ABI not found using any strategy - ${chain}/${address}`);
  }
}
