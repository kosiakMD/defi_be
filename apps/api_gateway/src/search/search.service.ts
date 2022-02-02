import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ServiceEnum } from '@app/common';
import { Logger } from '@app/common/Logger/Logger.service';
import { isSomeAddress } from '@app/common/utils';
import { Web3NameService } from '@app/common/web3provider/web3.name.service';

import { BaseService } from '../common/services/base.service';

import { SearchParams, SearchResults, SearchResultsBaseEntry } from './interfaces/search.interface';
import { addressSearchResultParser } from './utils/search.utils';

@Injectable()
export class SearchService extends BaseService {
  private readonly accountUrl: string;
  private readonly integrationUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
    private readonly web3NameService: Web3NameService,
  ) {
    super(logger, httpService, configService);

    this.accountUrl = this.getServiceUrl(ServiceEnum.Account);
    this.integrationUrl = this.getServiceUrl(ServiceEnum.Integration);
  }

  public async search(text: string): Promise<SearchResults> {
    if (isSomeAddress(text)) {
      const searchResult = await this.getSearchEntries({ address: text });
      return addressSearchResultParser(text, searchResult);
    }
    try {
      const address = await this.web3NameService.resolveName(text);
      if (address) {
        this.logger.debug(`Resolved address ${address}`);
        const searchResult = await this.getSearchEntries({ address, text });
        return addressSearchResultParser(address, searchResult);
      }
    } catch (error) {
      this.logger.debug(`Error to resolve address ${error}`);
    }
    return this.getSearchEntries({ text });
  }

  private getServiceUrl(serviceName: ServiceEnum): string {
    const service = serviceName.toUpperCase();
    const host = this.configService.get<string>(`${service}_SERVICE_HOST`);
    const port = this.configService.get<string>(`${service}_SERVICE_PORT`);
    return `${host}${port ? ':' + port : ''}`;
  }

  private async getSearchEntries(params: SearchParams): Promise<SearchResults> {
    const urls = [
      new URL('v1/assets/search', this.accountUrl),
      new URL('v1/protocols/search/projects', this.integrationUrl),
      new URL('v1/protocols/search/vaults', this.integrationUrl),
    ];
    const searchResults = await Promise.all<SearchResultsBaseEntry>(
      urls.map((url) => this.requestProxy(url.toString(), 'GET', { params })),
    );

    return {
      entries: searchResults.flat(),
    };
  }
}
