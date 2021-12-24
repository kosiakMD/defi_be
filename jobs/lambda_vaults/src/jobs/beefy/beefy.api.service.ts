import { AxiosResponse } from 'axios';
import { firstValueFrom, from } from 'rxjs';
import { filter, switchMap, toArray } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { BeefySupportedChains, IBeefyHttpVault } from './interfaces';
import staticBeefyData from './staticBeefyData';

@Injectable({ scope: Scope.TRANSIENT })
export class BeefyApiService {
  vaultEndpoint = `https://api.beefy.finance/vaults`;
  chain: ChainIdEnum;
  supportedChains: Partial<Record<ChainIdEnum, BeefySupportedChains>> = {
    [ChainIdEnum.arbi]: 'arbitrum',
    [ChainIdEnum.avax]: 'avax',
    [ChainIdEnum.bsc]: 'bsc',
    [ChainIdEnum.celo]: 'celo',
    [ChainIdEnum.cro]: 'cronos',
    [ChainIdEnum.ftm]: 'fantom',
    [ChainIdEnum.harm]: 'one',
    [ChainIdEnum.heco]: 'heco',
    [ChainIdEnum.mriver]: 'moonriver',
    [ChainIdEnum.plg]: 'polygon',
  };

  // Enabled Platforms. These should already be supported by us
  // Or at least a uniswap clone for basic support
  platforms = {
    [ChainIdEnum.ftm]: ['SpookySwap', 'TombFinance'],
    [ChainIdEnum.bsc]: ['PancakeSwap'],
    [ChainIdEnum.avax]: ['TraderJoe', 'Aave', 'Pangolin'],
    [ChainIdEnum.cro]: ['VVS', 'CronaSwap'],
    [ChainIdEnum.mriver]: ['SolarBeam'],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  initialize(chain: ChainIdEnum) {
    if (!this.supportedChains[chain]) throw new Error(`Unsupported Beefy Chain ${chain}`);
    this.chain = chain;
  }

  async fetchVaults(): Promise<IBeefyHttpVault[]> {
    if (!this.platforms[this.chain]?.length) {
      this.logger.warn(
        `No Platforms Enabled for chain ${this.chain}`,
        'BeefyApiService.fetchVaults',
      );
    }

    const response$ = await this.httpService.get(this.vaultEndpoint).pipe(
      switchMap((axiosResponse: AxiosResponse<IBeefyHttpVault[]>) => {
        return firstValueFrom(
          from(
            axiosResponse.data.length ? axiosResponse.data : (staticBeefyData as IBeefyHttpVault[]),
          ).pipe(
            filter(({ status }) => status === 'active'),
            filter(({ chain }) => chain === this.supportedChains[this.chain]),
            filter(({ platform }) => this.platforms[this.chain]?.includes(platform)),
            toArray(),
          ),
        );
      }),
    );

    const data = await firstValueFrom(response$);

    if (!data.length) {
      this.logger.error('No Beefy Vaults Found. Likely Rate Limited, Try Again Later');
    }

    this.logger.log(
      `Found ${data.length} vaults for chain ${this.chain}`,
      'BeefyApiService.fetchVaults',
    );

    return data;
  }
}
