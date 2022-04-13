import type { AbiItem } from 'web3-utils';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Address, ChainId } from '@app/common';

@Injectable()
export class BlockScout {
  constructor(protected httpService: HttpService, protected config: ConfigService) {}

  async fetchAbi(address: Address, chain: ChainId): Promise<AbiItem[] | void> {
    JSON.stringify({ address, chain });
    //
  }
}
