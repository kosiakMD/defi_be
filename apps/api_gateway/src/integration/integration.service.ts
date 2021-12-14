import { map } from 'rxjs/operators';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResult } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Pool, ProtocolName, Vault } from '@app/common';
import { Logger } from '@app/common/Logger/Logger.service';
import { RequestErrorHandler } from '@app/common/decorators';

import { FeaturesResponseDto } from '../common/DTO/features.dto';
import { IntegrationsResponseDto } from '../common/DTO/integrations.dto';

import { BalancesResponse } from '../account/account.interfaces';

@Injectable()
export class IntegrationService {
  private readonly getStatusUrl: string;
  private readonly getUniswapUrl: string;
  private readonly getSushiswapUrl: string;
  private readonly getPangolinUrl: string;
  private readonly getPancakeUrl: string;
  private readonly getSpookyswapUrl: string;
  private readonly getPoolsUrl: string;
  private readonly getVaultsUrl: string;
  private readonly protocolsUrl: string;
  private readonly protocolsUrlV2: string;
  private readonly protocolsActiveUrl: string;

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

    const pangolinPath = this.configService.get<string>('INTEGRATION_PANGOLIN');
    this.getPangolinUrl = `${url}/${pangolinPath}`;

    const spookyswapPath = this.configService.get<string>('INTEGRATION_SPOOKYSWAP');
    this.getSpookyswapUrl = `${url}/${spookyswapPath}`;

    const poolsPath = this.configService.get<string>('POOLS_PATH');
    this.getPoolsUrl = `${url}/${poolsPath}`;

    const vaultsPath = this.configService.get<string>('VAULTS_PATH');
    this.getVaultsUrl = `${url}/${vaultsPath}`;

    const protocolsPath = this.configService.get<string>('INTEGRATION_PROTOCOLS');
    const protocolsPathV2 = this.configService.get<string>('INTEGRATION_PROTOCOLS_V2');
    this.protocolsUrl = `${url}/${protocolsPath}`;
    this.protocolsUrlV2 = `${url}/${protocolsPathV2}`;

    this.protocolsActiveUrl = `${url}/v1/protocols/active`;
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

  // todo: must be BaseData
  async getUniswap(addresses: string): Promise<any[]> {
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

  // todo: must be BaseData
  async getSushiswap(addresses: string): Promise<any[]> {
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

  @RequestErrorHandler()
  async getPangolin(addresses: string, chains?: string): Promise<BalancesResponse> {
    this.logger.time(this.getPangolinUrl);
    const data = await this.httpService
      .get(this.getPangolinUrl, { params: { addresses, chains } })
      .pipe(map((r) => r.data))
      .toPromise();
    this.logger.timeEnd(this.getPangolinUrl);
    return data;
  }

  @RequestErrorHandler()
  async getSpookyswap(addresses: string, chains?: string): Promise<BalancesResponse> {
    this.logger.time(this.getSpookyswapUrl);
    const data = await this.httpService
      .get(this.getSpookyswapUrl, { params: { addresses, chains } })
      .pipe(map((r) => r.data))
      .toPromise();
    this.logger.timeEnd(this.getSpookyswapUrl);
    return data;
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
      this.logger.time(this.protocolsUrl);
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

  async getAllFeaturesActive(): Promise<FeaturesResponseDto> {
    try {
      this.logger.time(this.protocolsUrl);
      const data = await this.httpService
        .get(this.protocolsActiveUrl)
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

  @RequestErrorHandler()
  async getProtocolFeaturesDataV2(
    protocolName: ProtocolName,
    chains: string,
    addresses: Address[],
  ): Promise<IntegrationsResponseDto> {
    const url = `${this.protocolsUrlV2}/${protocolName}/`;

    this.logger.time(url);
    const data = await this.httpService
      .get(url, { params: { chains, addresses } })
      .pipe(map((r) => r.data))
      .toPromise();
    this.logger.timeEnd(url);
    return data;
  }
}
