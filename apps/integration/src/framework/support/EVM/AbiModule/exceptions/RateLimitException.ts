import { Address, ChainId } from '@app/common';

import { AbiSource } from '../abi.source.interface';

export class RateLimitException extends Error {
  constructor(chain: ChainId, address: Address, strategy: AbiSource) {
    super(`Rate Limit Exceeded - ${chain}/${address} (${strategy.constructor.name})`);
  }
}
