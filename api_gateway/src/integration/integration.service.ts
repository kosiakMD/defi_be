import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';

import { Logger } from '../common/Logger/Logger.service';
import { BaseData, Pool, Vault } from '../common/interfaces';

@Injectable()
export class IntegrationService {
  private readonly getStatusUrl: string;
  private readonly getUniswapUrl: string;
  private readonly getSushiswapUrl: string;
  private readonly getBalancerUrl: string;
  private readonly getCurveUrl: string;
  private readonly getPoolsUrl: string;
  private readonly getVaultsUrl: string;

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

    const balancerPath = this.configService.get<string>('INTEGRATION_BALANCER');
    this.getBalancerUrl = `${url}/${balancerPath}`;

    const curvePath = this.configService.get<string>('INTEGRATION_CURVE');
    this.getCurveUrl = `${url}/${curvePath}`;

    const poolsPath = this.configService.get<string>('POOLS_PATH');
    this.getPoolsUrl = `${url}/${poolsPath}`;

    const vaultsPath = this.configService.get<string>('VAULTS_PATH');
    this.getVaultsUrl = `${url}/${vaultsPath}`;
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
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

  async getBalancer(addresses: string): Promise<BaseData[]> {
    try {
      this.logger.time(this.getBalancerUrl);
      const data = await this.httpService
        .get(this.getBalancerUrl, { params: { addresses } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getBalancerUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getCurve(addresses: string): Promise<BaseData[]> {
    try {
      this.logger.time(this.getCurveUrl);
      const data = await this.httpService
        .get(this.getCurveUrl, { params: { addresses } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getCurveUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getPools(): Promise<Pool[]> {
    try {
      this.logger.time(this.getPoolsUrl);
      const data = await this.httpService
        .get(this.getPoolsUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getPoolsUrl);
      return data;
    } catch (e) {
      if (e.isAxiosError) {
        this.logger.error(e.config.url);
        if (e.response) {
          this.logger.error(e.response.data);
        }
      }
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
        this.logger.error(e.config.url);
        if (e.response) {
          this.logger.error(e.response.data);
        }
      }
      throw e;
    }
  }
}
