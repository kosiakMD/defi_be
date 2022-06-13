import { firstValueFrom } from 'rxjs';
import type { AbiItem } from 'web3-utils';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import type { Address, ChainId, Logger } from '@app/common';
import { ChainIdEnum } from '@app/common';

import { AbiSource } from '../abi.source.interface';
import { RateLimitException } from '../exceptions/RateLimitException';

@Injectable()
export class BlockScan implements AbiSource {
  private readonly endpoints: Partial<Record<ChainIdEnum, string>> = {};
  private readonly apiKeys: Partial<Record<ChainIdEnum, string>> = {};

  constructor(
    protected httpService: HttpService,
    protected config: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
  ) {
    // Api Keys
    this.apiKeys[ChainIdEnum.ftm] = config.get('BLOCKSCAN_FTM_KEY');
    this.apiKeys[ChainIdEnum.eth] = config.get('BLOCKSCAN_ETH_KEY');
    this.apiKeys[ChainIdEnum.bnb] = config.get('BLOCKSCAN_BNB_KEY');
    this.apiKeys[ChainIdEnum.plg] = config.get('BLOCKSCAN_PLG_KEY');
    this.apiKeys[ChainIdEnum.mriver] = config.get('BLOCKSCAN_MOVR_KEY');
    this.apiKeys[ChainIdEnum.arbi] = config.get('BLOCKSCAN_ARBI_KEY');
    this.apiKeys[ChainIdEnum.avax] = config.get('BLOCKSCAN_AVAX_KEY');
    this.apiKeys[ChainIdEnum.opt] = config.get('BLOCKSCAN_OPT_KEY');

    // Endpoints
    this.endpoints[ChainIdEnum.ftm] = config.get('BLOCKSCAN_FTM_URL');
    this.endpoints[ChainIdEnum.eth] = config.get('BLOCKSCAN_ETH_URL');
    this.endpoints[ChainIdEnum.bnb] = config.get('BLOCKSCAN_BNB_URL');
    this.endpoints[ChainIdEnum.plg] = config.get('BLOCKSCAN_PLG_URL');
    this.endpoints[ChainIdEnum.mriver] = config.get('BLOCKSCAN_MOVR_URL');
    this.endpoints[ChainIdEnum.arbi] = config.get('BLOCKSCAN_ARBI_URL');
    this.endpoints[ChainIdEnum.avax] = config.get('BLOCKSCAN_AVAX_URL');
    this.endpoints[ChainIdEnum.opt] = config.get('BLOCKSCAN_OPT_URL');
    this.endpoints[ChainIdEnum.boba] = config.get('BLOCKSCAN_BOBA_URL');
  }

  async fetchAbi(address: Address, chain: ChainId): Promise<AbiItem[] | void> {
    if (!this.endpoints[chain]) {
      this.logger.debug(`Chain ${chain} not initialized for ABI fetching`, this.constructor.name);
      return;
    }

    const apiKey = this.apiKeys[chain];
    const data$ = this.httpService.get(this.endpoints[chain], {
      params: {
        module: 'contract',
        action: 'getabi',
        address,
        apiKey,
      },
    });

    const { data } = await firstValueFrom(data$);

    if (data.message === 'Max rate limit reached') {
      throw new RateLimitException(chain, address, this);
    }

    if (data.message !== 'OK') {
      throw new Error(data.result);
    }

    try {
      return JSON.parse(data.result);
    } catch {
      // Fail Gracefully. Maybe it was never meant to be...
      return;
    }
  }
}
