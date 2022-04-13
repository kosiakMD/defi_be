import { AxiosResponse } from 'axios';
import { firstValueFrom, from } from 'rxjs';
import { filter, switchMap, toArray } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { BeefySupportedChains, IBeefyHttpVault } from './interfaces';
import staticBeefyData from './staticBeefyData';

export class BeefyApiService {
  vaultEndpoint = `https://api.beefy.finance/vaults?t=${new Date().getTime()}`;

  vaults: Promise<IBeefyHttpVault[]>;

  supportedChains: Partial<Record<ChainIdEnum, BeefySupportedChains>> = {
    [ChainIdEnum.arbi]: 'arbitrum',
    [ChainIdEnum.avax]: 'avax',
    [ChainIdEnum.bnb]: 'bsc',
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
  // TODO: Add more platforms! :)
  platforms = {
    [ChainIdEnum.ftm]: ['SpookySwap', 'TombFinance'],
    [ChainIdEnum.bnb]: ['PancakeSwap'],
    [ChainIdEnum.avax]: ['TraderJoe', 'Aave', 'Pangolin'],
    [ChainIdEnum.cro]: ['VVS', 'CronaSwap'],
    [ChainIdEnum.mriver]: ['SolarBeam'],
    [ChainIdEnum.plg]: ['SushiSwap', 'QuickSwap'],
    [ChainIdEnum.arbi]: ['SushiSwap'],
    [ChainIdEnum.harm]: ['SushiSwap'],
    [ChainIdEnum.celo]: ['SushiSwap'],
    [ChainIdEnum.heco]: [], // TODO: disabled since no supported underlying platforms
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  async fetchVaults(chain: ChainIdEnum): Promise<IBeefyHttpVault[]> {
    if (!this.supportedChains[chain]) throw new Error(`Unsupported Beefy Chain ${chain}`);

    if (!this.platforms[chain]?.length) {
      this.logger.warn(`No Platforms Enabled for chain ${chain}`, 'BeefyApiService.fetchVaults');
    }

    const vaults = await this.getSharedActiveVaultInfo();

    const requestedChain = this.supportedChains[chain];

    const response$ = from(vaults).pipe(
      filter(({ chain }) => chain === requestedChain),
      filter(({ platform }) => this.platforms[chain]?.includes(platform)),
      toArray(),
    );

    const data = await firstValueFrom(response$);

    this.logger.log(
      `Found ${data.length} vaults for chain ${chain}`,
      'BeefyApiService.fetchVaults',
    );

    return data;
  }

  private getFallbackVaults(): IBeefyHttpVault[] {
    this.logger.warn('Failed to fetch beefy vaults. Falling back to static data');
    return staticBeefyData as IBeefyHttpVault[];
  }

  private async getSharedActiveVaultInfo() {
    if (this.vaults) {
      // User vaults from initial request
      return this.vaults;
    }

    this.vaults = new Promise((resolve) => {
      const response$ = this.httpService.get(this.vaultEndpoint).pipe(
        switchMap((axiosResponse: AxiosResponse<IBeefyHttpVault[]>) => {
          return firstValueFrom(
            from(axiosResponse.data.length ? axiosResponse.data : this.getFallbackVaults()).pipe(
              filter(({ status }) => status === 'active'),
              toArray(),
            ),
          );
        }),
      );

      firstValueFrom(response$).then((data) => {
        // Save the vaults so that when running other chains, we don't need to re-hit the beefy server
        resolve(data);
      });
    });

    return this.vaults;
  }
}
