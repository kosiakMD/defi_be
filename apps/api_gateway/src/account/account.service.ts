import axios from 'axios';
import { RequestErrorHandler } from 'jobs/lambda_vaults/src/utils/decorators/error.decorator';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResult } from '@nestjs/terminus';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Chains, DetailedResponse } from '@app/common';
import { Logger } from '@app/common/Logger/Logger.service';
import { ChainIdEnum, NftProjectEnum } from '@app/common/enum';
import { NftAssetsByAccounts, NftServiceInfo } from '@app/common/interfaces/nft.interface';

import { ProfitAndLossResponseDTO } from '../analytic/dto';
import { AssetResponseDto, AssetsDto } from '../assets/assets.dto';
import { SearchParams, SearchResultsAssetEntry } from '../search/search.interface';
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
  private readonly get24HourReturnsUrl: string;
  private readonly nftAssetsUrl: string;
  private readonly nftCollectionsUrl: string;
  private readonly nftProjectsUrl: string;
  private readonly searchUrl: string;

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

    const returnsPath = this.configService.get<string>('ACCOUNT_24H_RETURNS');
    this.get24HourReturnsUrl = `${url}/${returnsPath}`;

    const nftProjectsPath = this.configService.get<string>('NFT_PROJECTS');
    this.nftProjectsUrl = `${url}/${nftProjectsPath}`;

    const nftAssetsPath = this.configService.get<string>('NFT_ASSETS');
    this.nftAssetsUrl = `${url}/${nftAssetsPath}`;

    const searchUrl = this.configService.get<string>('ACCOUNT_SEARCH_URL');
    this.searchUrl = `${url}/${searchUrl}`;

    const nftCollectionsPath = this.configService.get<string>('NFT_COLLECTIONS');
    this.nftCollectionsUrl = `${url}/${nftCollectionsPath}`;
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
      // TODO: Remove this later
      this.logger.debug(
        `Loading balances for ${JSON.stringify(addresses)} networks ${JSON.stringify(chains)}`,
      );

      this.logger.time(this.getBalanceUrl);
      const data = await this.httpService
        .get(this.getBalanceUrl, { params: { addresses, chains } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.getBalanceUrl);

      // TODO: Remove this later
      this.logger.debug(
        `Loaded balances for ${JSON.stringify(addresses)} networks ${JSON.stringify(chains)}.`,
      );

      return data;
    } catch (e) {
      // TODO: This should be handled with global error handler
      this.logger.error(
        `Unhandled error while getting balances for ${JSON.stringify(
          addresses,
        )} networks ${JSON.stringify(chains)}`,
        e,
      );

      throw e;
    }
  }

  async get24HourReturns(
    addresses: Address[],
    chains?: Chains,
    assets?: Address[],
  ): Promise<BalancesResponse> {
    try {
      // TODO: Remove this later
      this.logger.debug(
        `Calculating 24h returns for ${JSON.stringify(addresses)} networks ${JSON.stringify(
          chains,
        )}`,
      );

      this.logger.time(this.get24HourReturnsUrl);
      const data = await this.httpService
        .get(this.get24HourReturnsUrl, { params: { addresses, chains, assets } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.get24HourReturnsUrl);

      // TODO: Remove this later
      this.logger.debug(
        `Calculated 24h returns for ${JSON.stringify(addresses)} networks ${JSON.stringify(
          chains,
        )}`,
      );

      return data;
    } catch (e) {
      // TODO: This should be handled with global error handler
      this.logger.error(
        `Unhandled error while calculating 24h returns for ${JSON.stringify(
          addresses,
        )} networks ${JSON.stringify(chains)}`,
        e,
      );

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

  async getNftProjects(): Promise<NftServiceInfo[]> {
    try {
      this.logger.time(this.nftProjectsUrl);
      const data = await this.httpService
        .get(this.nftProjectsUrl)
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(this.nftProjectsUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getNftCollections(
    projectName: NftProjectEnum,
    addresses: Address[],
    chains: ChainIdEnum[],
    collection: string,
  ) {
    try {
      const nftCollectionsProjectUrl = `${this.nftCollectionsUrl}/${projectName}`;
      this.logger.time(nftCollectionsProjectUrl);
      const data = await this.httpService
        .get(nftCollectionsProjectUrl, { params: { addresses, chains, collection } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(nftCollectionsProjectUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  async getNftAssets(
    projectName: NftProjectEnum,
    addresses: Address[],
    collection: string,
    chains: ChainIdEnum[],
  ): Promise<NftAssetsByAccounts> {
    try {
      const nftAssetsProjectUrl = `${this.nftAssetsUrl}/${projectName}`;
      this.logger.time(nftAssetsProjectUrl);
      const data = await this.httpService
        .get(nftAssetsProjectUrl, { params: { addresses, collection, chains } })
        .pipe(map((r) => r.data))
        .toPromise();
      this.logger.timeEnd(nftAssetsProjectUrl);
      return data;
    } catch (e) {
      e.response && this.logger.error(e.response.data);
      throw e;
    }
  }

  @RequestErrorHandler()
  async searchAssets(params: SearchParams): Promise<SearchResultsAssetEntry[]> {
    const searchUrl = this.searchUrl;
    this.logger.time(searchUrl);
    const { data } = await axios.get(searchUrl, { params });
    this.logger.timeEnd(searchUrl);
    return data;
  }
}
