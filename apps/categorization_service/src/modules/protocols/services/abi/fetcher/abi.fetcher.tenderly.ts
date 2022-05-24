import { firstValueFrom, lastValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { delay } from '@app/common/helpers/delay';

import { ChainAbi } from '../../../interfaces/abi.interfaces';
import { IAbiFetcher } from './abi.fetcher.interface';

@Injectable()
export class AbiFetcherTenderly implements IAbiFetcher {
  readonly apiUrl: string;
  readonly name = this.constructor.name;
  readonly retryInterval = 30000; //30 seconds
  readonly maxRetries = 3;

  private chainsInfo: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiUrl = this.configService.get('TENDERLY_API_URL');
  }

  async fetchAbiAndAbiCode(address: string): Promise<ChainAbi> {
    await this.ensureChainsInfo();
    //take first available chain to fetch contract details for
    const [chainId] = await this.searchForChainsWithContract(address);
    if (!chainId) {
      throw Error('contract not found');
    }
    return this.getContractDetails(chainId, address);
  }

  private async getContractDetails(chain: string, address: string, retries = 0): Promise<ChainAbi> {
    try {
      const details = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}/v1/public-contracts/${chain}/${address}`),
      );
      return {
        chain: this.chainsInfo.get(chain),
        abi: JSON.stringify(details.data.data.raw_abi),
        abiCode: details.data.data.contract_info[0].source,
      };
    } catch (e) {
      if (e.response.status === HttpStatus.TOO_MANY_REQUESTS) {
        this.logger.warn(`TOO_MANY_REQUESTS, waiting for ${this.retryInterval} ms`, this.name);
        if (retries < this.maxRetries) {
          await delay(this.retryInterval);
          this.logger.debug(`retrying: address=[${address}]`);
          return this.getContractDetails(chain, address, retries + 1);
        }
        this.logger.warn(`too many attempts (${retries}), giving up`, this.name);
      }
      throw e;
    }
  }

  private async searchForChainsWithContract(address: string): Promise<string[]> {
    const searchResult = await firstValueFrom(
      this.httpService.get(`${this.apiUrl}/v1/search?query=${address}`),
    );
    // eslint-disable-next-line camelcase
    return (searchResult.data.contracts || []).map(({ network_id }) => network_id);
  }

  private async ensureChainsInfo(): Promise<void> {
    if (this.chainsInfo) return;
    try {
      const chainsData = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/v1/public-networks`),
      );
      this.chainsInfo = new Map<string, string>(
        chainsData.data.map(({ id, name }) => [id, name.toLowerCase()]),
      );
    } catch (e) {
      this.logger.error(`AbiFetcherTenderly :: /v1/public-networks - ${e}`);
    }
  }
}
