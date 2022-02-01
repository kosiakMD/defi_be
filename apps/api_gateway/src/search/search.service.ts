import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { isSomeAddress } from '@app/common/utils';
import { Web3NameService } from '@app/common/web3provider/web3.name.service';

import { BaseService } from '../common/services/base.service';

import { SearchParams, SearchResults } from './interfaces/search.interface';
import { addressSearchResultParser } from './utils/search.utils';

@Injectable()
export class SearchService extends BaseService {
  accountHost = this.configService.get<string>('ACCOUNT_SERVICE_HOST');
  accountPort = this.configService.get<string>('ACCOUNT_SERVICE_PORT');
  accountUrl = `${this.accountHost}${this.accountPort ? ':' + this.accountPort : ''}`;

  integrationHost = this.configService.get<string>('INTEGRATION_SERVICE_HOST');
  integrationPort = this.configService.get<string>('INTEGRATION_SERVICE_PORT');
  integrationUrl = `${this.integrationHost}${
    this.integrationPort ? ':' + this.integrationPort : ''
  }`;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
    private readonly web3NameService: Web3NameService,
  ) {
    super(logger, httpService, configService);
  }

  private async getSearchEntries(params: SearchParams): Promise<SearchResults> {
    const searchResults = await Promise.all([
      this.requestProxy(this.accountUrl + 'v1/assets/search/projects', 'GET', { params }),
      this.requestProxy(this.integrationUrl + 'v1/protocols/search/projects', 'GET', { params }),
      this.requestProxy(this.integrationUrl + 'v1/protocols/search/vaults', 'GET', { params }),
    ]);
    return {
      entries: searchResults.flat(),
    };
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
}
