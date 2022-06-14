import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { AbiItem } from 'web3-utils';

import { HttpService } from '@nestjs/axios';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { getAbsoluteChainId } from '@app/common/utils';

import { AbiSource } from '../abi.source.interface';
import { RateLimitException } from '../exceptions/RateLimitException';

export class Tenderly implements AbiSource {
  private readonly baseURL = 'https://api.tenderly.co/api';
  private readonly headers?: { 'X-Access-Key': string };

  constructor(
    protected httpService: HttpService,
    protected config: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
  ) {
    const token = config.get('TENDERLY_API_KEY');
    if (token) {
      this.headers = { 'X-Access-Key': token };
    }
  }

  async fetchAbi(address: Address, chain: ChainIdEnum): Promise<void | AbiItem[]> {
    const absoluteChain = getAbsoluteChainId(chain);

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseURL}/v1/public-contracts/${absoluteChain}/${address}`, {
          headers: this.headers,
        }),
      );
      return data.data.raw_abi;
    } catch (err) {
      if (err.response.status === 429) {
        throw new RateLimitException(chain, address, this);
      }
      throw err;
    }
  }
}
