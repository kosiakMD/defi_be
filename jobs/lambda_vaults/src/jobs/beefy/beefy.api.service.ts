import { firstValueFrom, from } from 'rxjs';
import { filter, switchMap, toArray } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, Logger } from '@app/common';

import { BeefySupportedChains, IBeefyHttpVault, IBeefyHttpAprs } from './interfaces';
import staticBeefyData from './staticBeefyData';

export class BeefyApiService {
  private supportedChains: Partial<Record<ChainIdEnum, BeefySupportedChains>> = {
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

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  /**********
   * Fetch Beefy Vaults
   **********/

  private vaultEndpoint = `https://api.beefy.finance/vaults?t=${new Date().getTime()}`;

  private vaults: Promise<IBeefyHttpVault[]>;

  async fetchVaults(chain: ChainIdEnum): Promise<IBeefyHttpVault[]> {
    if (!this.supportedChains[chain]) throw new Error(`Unsupported Beefy Chain ${chain}`);

    const vaults = await this.getSharedActiveVaultInfo();

    const requestedChain = this.supportedChains[chain];

    const response$ = from(vaults).pipe(
      filter(({ chain }) => chain === requestedChain),
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
      const response$ = this.httpService.get<IBeefyHttpVault[]>(this.vaultEndpoint).pipe(
        switchMap((axiosResponse) => {
          return firstValueFrom(
            from(axiosResponse.data.length ? axiosResponse.data : this.getFallbackVaults()).pipe(
              filter(({ status }) => status === 'active'),
              toArray(),
            ),
          );
        }),
      );

      // Save the vaults so that when running other chains, we don't need to re-hit the beefy server
      firstValueFrom(response$).then(resolve);
    });

    return this.vaults;
  }

  /**************
   * Fetch Beefy APRs
   **************/

  private aprEndpoint = `https://api.beefy.finance/apy/breakdown?t=${new Date().getTime()}`;

  private aprs: Promise<IBeefyHttpAprs>;

  async fetchAprs(): Promise<IBeefyHttpAprs> {
    if (this.aprs) {
      return this.aprs;
    }

    // Save the aprs tp a shared promise so that when running other chains,
    // we don't need to re-hit the beefy server
    this.aprs = new Promise((resolve) => {
      const response$ = this.httpService
        .get<IBeefyHttpAprs>(this.aprEndpoint)
        .pipe(switchMap(async (r) => r.data));

      firstValueFrom(response$).then(resolve);
    });

    return this.aprs;
  }
}
