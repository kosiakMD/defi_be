import path from 'path';
import type { AbiItem } from 'web3-utils';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import type { Address, ChainId, Logger } from '@app/common';

import { AbiSource } from '../abi.source.interface';

@Injectable()
export class LocalFile implements AbiSource {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger) {}

  async fetchAbi(address: Address, chain: ChainId): Promise<AbiItem[] | void> {
    try {
      const { default: abi } = await import(path.join(__dirname, `./ABIs/${chain}/${address}`));
      return JSON.parse(abi);
    } catch (e) {
      return;
    }
  }
}
