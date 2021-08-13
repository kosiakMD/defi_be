import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';
import { NetworkResponseDto } from 'src/networks/dto';
import { PartnerResponseDto } from 'src/partners/dto';
import { ProjectsResponseDto } from 'src/projects/dto';
import { ScamsResponseDto } from 'src/scams/dto';
import { ScamFunctionResponseDto } from 'src/scams/dto/scam.function.response.dto';
import { ScamTypeResponseDto } from 'src/scams/dto/scam.type.response.dto';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResult } from '@nestjs/terminus';

import { SafeFilterOptionsQueryDto } from 'src/common/DTO/SafeFilterOptionsQuery.dto';
import { Logger } from 'src/common/Logger/Logger.service';

@Injectable()
export class SafeProxyService {
  private readonly getStatusUrl: string;
  private readonly getNetworksUrl: string;
  private readonly getPartnersUrl: string;
  private readonly getProjectsUrl: string;
  private readonly getScamsUrl: string;
  private readonly getScamTypesUrl: string;
  private readonly getScamFunctionsUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('SAFE_PROXY_SERVICE_HOST');
    const port = this.configService.get<string>('SAFE_PROXY_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getStatusUrl = this.configService.get<string>('SAFE_PROXY_STATUS');
    this.getStatusUrl = `${url}/${getStatusUrl}`;

    const getNetworksUrl = this.configService.get<string>('SAFE_PROXY_NETWORKS');
    this.getNetworksUrl = `${url}/${getNetworksUrl}`;

    const getPartnersUrl = this.configService.get<string>('SAFE_PROXY_PARTNERS');
    this.getPartnersUrl = `${url}/${getPartnersUrl}`;

    const getProjectsUrl = this.configService.get<string>('SAFE_PROXY_PROJECTS');
    this.getProjectsUrl = `${url}/${getProjectsUrl}`;

    const getScamsUrl = this.configService.get<string>('SAFE_PROXY_SCAMS');
    this.getScamsUrl = `${url}/${getScamsUrl}`;

    const getScamTypesUrl = this.configService.get<string>('SAFE_PROXY_SCAM_TYPES');
    this.getScamTypesUrl = `${url}/${getScamTypesUrl}`;

    const getScamFunctionsUrl = this.configService.get<string>('SAFE_PROXY_SCAM_FUNCTIONS');
    this.getScamFunctionsUrl = `${url}/${getScamFunctionsUrl}`;
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

  async getNetworks(): Promise<NetworkResponseDto[]> {
    try {
      this.logger.time(this.getNetworksUrl);
      const data = await this.httpService
        .get(this.getNetworksUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getNetworksUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getPartners(): Promise<PartnerResponseDto[]> {
    try {
      this.logger.time(this.getPartnersUrl);
      const data = await this.httpService
        .get(this.getPartnersUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getPartnersUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getProjects(options: SafeFilterOptionsQueryDto): Promise<ProjectsResponseDto[]> {
    try {
      this.logger.time(this.getProjectsUrl);
      const data = await this.httpService
        .get(this.getProjectsUrl, { params: options })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getProjectsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getScams(options: SafeFilterOptionsQueryDto): Promise<ScamsResponseDto> {
    try {
      this.logger.time(this.getProjectsUrl);
      const data = await this.httpService
        .get(this.getScamsUrl, { params: options })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getProjectsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getScamTypes(): Promise<ScamTypeResponseDto[]> {
    try {
      this.logger.time(this.getProjectsUrl);
      const data = await this.httpService
        .get(this.getScamTypesUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getProjectsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getScamFunctions(): Promise<ScamFunctionResponseDto[]> {
    try {
      this.logger.time(this.getProjectsUrl);
      const data = await this.httpService
        .get(this.getScamFunctionsUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getProjectsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }
}
