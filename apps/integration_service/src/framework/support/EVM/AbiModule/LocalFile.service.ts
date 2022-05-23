import path from 'path';
import type { AbiItem } from 'web3-utils';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import type { Address, ChainId, Logger } from '@app/common';

@Injectable()
export class LocalFile {
  constructor(
    protected httpService: HttpService,
    protected config: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
  ) {}

  async getAbi(address: Address, chain: ChainId): Promise<AbiItem[] | void> {
    try {
      const { default: abi } = await import(path.join(__dirname, `./ABIs/${chain}/${address}`));
      return JSON.parse(abi);
    } catch (e) {
      this.logger.debug(`Chain ${chain} not found for ABI getting`, this.constructor.name);
      return;
    }
  }
}
