import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  Farm,
  MarinadeFarmsResponse,
  MarinadePoolsResponse,
  Pool,
  SolanaToken,
  SolanaTokensResponse,
} from './marinade.interface';

@Injectable()
export class MarinadeUtils {
  sonarFarmsURI: string;
  sonarPoolsURI: string;
  solanaTokensURI: string;

  public farms: Map<string, Farm>;
  public pools: Map<string, Pool>;
  public assets: Map<string, SolanaToken>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.sonarPoolsURI = this.configService.get<string>('SONAR_POOLS_PUBLIC_API');
    this.sonarFarmsURI = this.configService.get<string>('SONAR_FARMS_PUBLIC_API');
    this.solanaTokensURI = this.configService.get<string>('SOLANA_TOKENS_PUBLIC_API');
  }

  public async initMarinadePools() {
    this.assets = await this.getTokensInformation();
    this.pools = await this.getPoolInformation();
  }

  public async initMarinadeFarms() {
    this.assets = await this.getTokensInformation();
    this.farms = await this.getFarmInformation();
  }

  public async getTokensInformation(): Promise<Map<string, SolanaToken>> {
    const request = this.httpService
      .get<SolanaTokensResponse>(this.solanaTokensURI)
      .pipe(map((r) => r.data));
    const response = await firstValueFrom(request);

    return new Map(response.tokens.map((token) => [token.address, token]));
  }

  private async getPoolInformation(): Promise<Map<string, Pool>> {
    const request = this.httpService
      .get<MarinadePoolsResponse>(this.sonarPoolsURI)
      .pipe(map((r) => r.data));
    const response = await firstValueFrom(request);

    const marinadeMap = new Map<string, Pool>();

    for (const pool of Object.values(response)) {
      if (pool.platform === 'marinade' && this.assets.has(pool.lp.mint)) {
        marinadeMap.set(pool.lp.mint, pool);
      }
    }

    return marinadeMap;
  }

  private async getFarmInformation(): Promise<Map<string, Farm>> {
    const request = this.httpService
      .get<MarinadeFarmsResponse>(this.sonarFarmsURI)
      .pipe(map((r) => r.data));
    const response = await firstValueFrom(request);

    const farmMap = new Map<string, Farm>();

    for (const farm of Object.values(response)) {
      if (farm.method === 'quarry_farm') {
        const replicaFarms = farm.additional.replicaFarms;

        if (replicaFarms.length > 0) {
          replicaFarms.map((replicaFarm) => {
            replicaFarm.additional.replicaMint = farm.additional.replicaMint;
            farmMap.set(replicaFarm.address, replicaFarm);
          });
          farm.additional.replicaFarms = [];
        }

        farmMap.set(farm.address, farm);
      }
    }

    return farmMap;
  }
}
