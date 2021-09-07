import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResult } from '@nestjs/terminus';

import { FeaturesResponseDto } from '../common/DTO/features.dto';
import { IntegrationsResponseDto } from '../common/DTO/integrations.dto';
import { RequestErrorHandler } from '../common/decorators';
import { Logger } from 'src/common/Logger/Logger.service';
import { Address, BaseData, Pool, ProtocolName, Vault } from 'src/common/interfaces';

import { BalancesResponse } from '../account/account.interfaces';

@Injectable()
export class IntegrationService {
  private readonly getStatusUrl: string;
  private readonly getUniswapUrl: string;
  private readonly getSushiswapUrl: string;
  private readonly getPancakeUrl: string;
  private readonly getPoolsUrl: string;
  private readonly getVaultsUrl: string;
  private readonly protocolsUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('INTEGRATION_SERVICE_HOST');
    const port = this.configService.get<string>('INTEGRATION_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getStatusUrl = this.configService.get<string>('INTEGRATION_STATUS');
    this.getStatusUrl = `${url}/${getStatusUrl}`;

    const uniswapPath = this.configService.get<string>('INTEGRATION_UNISWAP');
    this.getUniswapUrl = `${url}/${uniswapPath}`;

    const sushiswapPath = this.configService.get<string>('INTEGRATION_SUSHISWAP');
    this.getSushiswapUrl = `${url}/${sushiswapPath}`;

    const pancakePath = this.configService.get<string>('INTEGRATION_PANCAKE');
    this.getPancakeUrl = `${url}/${pancakePath}`;

    const poolsPath = this.configService.get<string>('POOLS_PATH');
    this.getPoolsUrl = `${url}/${poolsPath}`;

    const vaultsPath = this.configService.get<string>('VAULTS_PATH');
    this.getVaultsUrl = `${url}/${vaultsPath}`;

    const protocolsPath = this.configService.get<string>('INTEGRATION_PROTOCOLS');
    this.protocolsUrl = `${url}/${protocolsPath}`;
  }

  async isHealthy(): Promise<HealthCheckResult> {
    try {
      this.logger.time('request: ' + this.getStatusUrl);
      const data = await this.httpService
        .get(this.getStatusUrl)
        .pipe(map((response) => response.data))
        .toPromise();
      this.logger.timeEnd('request: ' + this.getStatusUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getUniswap(addresses: string): Promise<BaseData[]> {
    try {
      this.logger.time(this.getUniswapUrl);
      const data = await this.httpService
        .get(this.getUniswapUrl, { params: { addresses } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getUniswapUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getSushiswap(addresses: string): Promise<BaseData[]> {
    try {
      this.logger.time(this.getSushiswapUrl);
      const data = await this.httpService
        .get(this.getSushiswapUrl, { params: { addresses } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getSushiswapUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getPancake(addresses: string, chains?: string): Promise<BalancesResponse> {
    try {
      this.logger.time(this.getPancakeUrl);
      const data = await this.httpService
        .get(this.getPancakeUrl, { params: { addresses, chains } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getPancakeUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getPools(): Promise<Pool[]> {
    try {
      this.logger.time(this.getPoolsUrl);
      const response = await this.httpService.get(this.getPoolsUrl).toPromise();
      this.logger.timeEnd(this.getPoolsUrl);
      return response.data;
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      }
      this.logger.error(e);
      throw e;
    }
  }

  async getVaults(): Promise<Vault[]> {
    try {
      this.logger.time(this.getVaultsUrl);
      const data = await this.httpService
        .get(this.getVaultsUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getVaultsUrl);
      return data;
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      }
      throw e;
    }
  }

  async getAllFeatures(): Promise<FeaturesResponseDto> {
    try {
      this.logger.time(`${this.protocolsUrl}/`);
      const data = await this.httpService
        .get(this.protocolsUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.protocolsUrl);
      return data;
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(new Error(`${e.code} at ${e.config.url}`));
        if (e.response) {
          this.logger.error(e.response.data);
        }
      }
      throw e;
    }
  }

  @RequestErrorHandler()
  async getProtocolFeaturesData(
    protocolName: ProtocolName,
    chains: string,
    addresses: Address,
  ): Promise<IntegrationsResponseDto> {
    const url = `${this.protocolsUrl}/${protocolName}/`;

    this.logger.time(url);
    const data = await this.httpService
      .get(url, { params: { chains, addresses } })
      .pipe(map((r) => r.data))
      .toPromise();
    this.logger.timeEnd(url);
    return data;
  }
}
