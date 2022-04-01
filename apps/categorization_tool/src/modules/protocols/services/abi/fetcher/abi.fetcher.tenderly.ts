import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainAbi } from '../../../interfaces/abi.interfaces';
import { IAbiFetcher } from './abi.fetcher.interface';

@Injectable()
export class AbiFetcherTenderly implements IAbiFetcher {
  readonly apiUrl: string;

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
      throw Error('AbiFetcherTenderly: contract not found');
    }
    return this.getContractDetails(chainId, address);
  }

  private async getContractDetails(chain: string, address: string): Promise<ChainAbi> {
    const details = await firstValueFrom(
      this.httpService.get(`${this.apiUrl}/v1/public-contracts/${chain}/${address}`),
    );
    return {
      abi: details.data.data.abi,
      abiCode: details.data.data.contract_info[0].source,
    };
  }

  private async searchForChainsWithContract(address: string): Promise<string[]> {
    const searchResult = await firstValueFrom(
      this.httpService.get(`${this.apiUrl}/v1/search?query=${address}`),
    );
    // eslint-disable-next-line camelcase
    return searchResult.data.contracts?.map(({ network_id }) => network_id);
  }

  private async ensureChainsInfo(): Promise<void> {
    if (this.chainsInfo) return;
    try {
      const chainsData = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/v1/public-networks`),
      );
      this.chainsInfo = chainsData.data.map(({ id, name }) => [id, name.toLowerCase()]);
    } catch (e) {
      this.logger.error(`AbiFetcherTenderly :: /v1/public-networks - ${e}`);
    }
  }
}
