import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { map } from 'rxjs/operators';
import { ProfitAndLossResponseDTO } from 'src/analytic/dto';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResult } from '@nestjs/terminus';

import { ChainIdEnum } from '../common/enum';
import { Logger } from 'src/common/Logger/Logger.service';
import { Address, Chains, DetailedResponse } from 'src/common/interfaces';

import { AssetResponseDto, AssetsDto } from '../assets/assets.dto';
import { TransactionsNewDetailedResponseDto } from '../transactions/transactions.dto';
import { TransactionsResponse } from '../transactions/transactions.interfaces';
import { TransfersResponse } from '../transfers/transfers.interfaces';
import { ApprovalDTO } from './account.dto';
import { BalancesResponse } from './account.interfaces';

@Injectable()
export class AccountService {
  private readonly getStatusUrl: string;
  private readonly getTransactionsUrl: string;
  private readonly getTransactionsNewUrl: string;
  private readonly getTransfersUrl: string;
  private readonly getBalanceUrl: string;
  private readonly getApprovalsUrl: string;
  private readonly getAllAssetsUrl: string;
  private readonly getAssetsUrl: string;
  private readonly getAnalyticUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    const host = this.configService.get<string>('ACCOUNT_SERVICE_HOST');
    const port = this.configService.get<string>('ACCOUNT_SERVICE_PORT');
    const url = `${host}${port ? ':' + port : ''}`;

    const getStatusUrl = this.configService.get<string>('ACCOUNT_STATUS');
    this.getStatusUrl = `${url}/${getStatusUrl}`;

    const transactionsPath = this.configService.get<string>('ACCOUNT_TRANSACTIONS');
    this.getTransactionsUrl = `${url}/${transactionsPath}`;
    this.getTransactionsNewUrl = `${url}/${transactionsPath}/new`;

    const transfersPath = this.configService.get<string>('ACCOUNT_TRANSFERS');
    this.getTransfersUrl = `${url}/${transfersPath}`;

    const balancePath = this.configService.get<string>('ACCOUNT_BALANCE');
    this.getBalanceUrl = `${url}/${balancePath}`;

    const approvalsPath = this.configService.get<string>('ACCOUNT_APPROVALS');
    this.getApprovalsUrl = `${url}/${approvalsPath}`;

    const assetsPath = this.configService.get<string>('ACCOUNT_ASSETS');
    this.getAllAssetsUrl = `${url}/${assetsPath}/all`;
    this.getAssetsUrl = `${url}/${assetsPath}`;

    const analyticPath = this.configService.get<string>('ACCOUNT_ANALYTIC');
    this.getAnalyticUrl = `${url}/${analyticPath}`;
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

  async getTransactions(addresses: Address[], chains?: Chains): Promise<TransactionsResponse[]> {
    try {
      this.logger.time(this.getTransactionsUrl);
      const data = await this.httpService
        .get(this.getTransactionsUrl, { params: { addresses, chains } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getTransactionsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getTransactionsNew(
    addresses: Address[],
    chains?: Chains,
  ): Promise<TransactionsNewDetailedResponseDto> {
    try {
      this.logger.time(this.getTransactionsNewUrl);
      const data = await this.httpService
        .get(this.getTransactionsNewUrl, { params: { addresses, chains } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getTransactionsNewUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getTransfers(addresses: Address[], chains?: Chains): Promise<TransfersResponse> {
    try {
      this.logger.time(this.getTransfersUrl);
      const data = await this.httpService
        .get(this.getTransfersUrl, { params: { addresses, chains } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getTransfersUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getBalances(addresses: Address[], chains?: Chains): Promise<BalancesResponse> {
    try {
      this.logger.time(this.getBalanceUrl);
      const data = await this.httpService
        .get(this.getBalanceUrl, { params: { addresses, chains } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getBalanceUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getApprovals(addresses: string, chains?: string): Promise<ApprovalDTO[]> {
    try {
      this.logger.time(this.getApprovalsUrl);
      const data = await this.httpService
        .get(this.getApprovalsUrl, { params: { addresses, chains } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getApprovalsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getAssets(): Promise<AssetsDto[]> {
    try {
      this.logger.time(this.getAllAssetsUrl);
      const data = await this.httpService
        .get(this.getAllAssetsUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getAllAssetsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      this.logger.error(e, 'AccountService.getAssets');
      throw e;
    }
  }

  async getAssetsByAddressesAndChains(
    addresses: Address[],
    chains: Chains,
  ): Promise<DetailedResponse<AssetResponseDto[]>> {
    try {
      this.logger.time(this.getAssetsUrl);
      const data = await this.httpService
        .get(this.getAssetsUrl, { params: { addresses, chains } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getAssetsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      this.logger.error(e, 'AccountService.getAssetsByAddressesAndChains');
      throw e;
    }
  }

  async getProfitAndLoss(
    asset: Address,
    chain: ChainIdEnum,
    addresses: Address,
  ): Promise<ProfitAndLossResponseDTO> {
    try {
      this.logger.time(this.getAnalyticUrl);
      const data = await this.httpService
        .get(this.getAnalyticUrl, { params: { asset, chain, addresses } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getAnalyticUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }
}
