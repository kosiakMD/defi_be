import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ProtocolDataDto, ServiceEnum } from '@app/common';
import { Logger } from '@app/common/Logger/Logger.service';
import { isSomeAddress } from '@app/common/utils';
import { Web3NameService } from '@app/common/web3provider/web3.name.service';

import { BaseService } from '../common/services/base.service';

import { AddressSuggestionDto } from './dto/address-suggestion.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultType } from './interfaces/search.enum';
import {
  SearchParams,
  SearchResults,
  SearchResultsAddressEntry,
  SearchResultsBaseEntry,
} from './interfaces/search.interface';
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

  public async getAddressSuggestions(query: SearchQueryDto): Promise<AddressSuggestionDto[]> {
    const { text } = query;
    // TODO extend this implementation to get all ENS,TNS and etc resolves + check which networks has the query address
    if (isSomeAddress(text)) {
      return [new AddressSuggestionDto(text)];
    }
    return this.tryToResolveAddress(query);
  }

  public async search(query: SearchQueryDto): Promise<SearchResults> {
    const { text, limit } = query;
    if (isSomeAddress(text)) {
      const searchResult = await this.getSearchEntries({ address: text, limit });
      if (!searchResult.entries.length) {
        searchResult.entries.push(this.getAddressSearchEntry(text));
      }
      return addressSearchResultParser(text, searchResult);
    }
    try {
      const address = await this.web3NameService.resolveName(text);
      if (address) {
        this.logger.debug(`Resolved address ${address}`);
        const searchResult = await this.getSearchEntries({ address, text, limit });
        if (!searchResult.entries.length) {
          searchResult.entries.push(this.getAddressSearchEntry(text));
        }
        return addressSearchResultParser(address, searchResult);
      }
    } catch (error) {
      this.logger.debug(`Error to resolve address ${error}`);
    }
    return this.getSearchEntries({ text, limit });
  }

  private getAddressSearchEntry(address: string): SearchResultsAddressEntry {
    return {
      type: SearchResultType.ADDRESS,
      metadata: { address },
    };
  }

  private async tryToResolveAddress(query: SearchQueryDto): Promise<AddressSuggestionDto[]> {
    const { text } = query;
    // need it to check ENS name on all networks
    const substitution = text.endsWith('.') ? text.slice(0, -1) : text;
    const addresses = await Promise.all([
      this.web3NameService.resolveNameResponseWithName(`${substitution}.eth`.toLowerCase()),
      this.web3NameService.resolveNameResponseWithName(`${substitution}.tns`.toLowerCase()),
      this.web3NameService.resolveNameResponseWithName(`${substitution}.tns`.toUpperCase()),
      this.web3NameService.resolveNameResponseWithName(`${substitution}.ust`.toLowerCase()),
      this.web3NameService.resolveNameResponseWithName(`${substitution}.ust`.toUpperCase()),
      this.web3NameService.resolveNameResponseWithName(text.toLowerCase()),
      this.web3NameService.resolveNameResponseWithName(text.toUpperCase()),
    ]);
    return addresses //
      .filter((result) => !!result)
      .map(({ address, name }) => new AddressSuggestionDto(address, name));
  }

  private getServiceUrl(serviceName: ServiceEnum): string {
    const service = serviceName.toUpperCase();
    const host = this.configService.get<string>(`${service}_SERVICE_HOST`);
    const port = this.configService.get<string>(`${service}_SERVICE_PORT`);
    return `${host}${port ? ':' + port : ''}`;
  }

  private async getSearchEntries(params: SearchParams): Promise<SearchResults> {
    const assetsSearchUrl = new URL('v1/assets/search', this.accountUrl);
    const protocolsSearchUrl = new URL('v1/protocols', this.integrationUrl);
    const promises = [
      this.requestProxy(assetsSearchUrl.toString(), 'GET', { params }),
      this.requestProxy(protocolsSearchUrl.toString()),
      // this.requestProxy(`{this.integrationUrl}/v1`),
    ];
    const searchResults = await Promise.all(promises);
    const assetsSearchResults: SearchResultsBaseEntry[] = searchResults.shift();
    const protocolsSearchResponse: ProtocolDataDto[] = searchResults.shift()?.data || [];
    const query = `${params.text}`.toLowerCase();
    const protocolsSearchResult = protocolsSearchResponse //
      .filter(
        ({ name, project }) =>
          `${name.toLowerCase()}`.includes(query) || `${project.toLowerCase()}`.includes(query),
      )
      .map((protocol) => ({
        name: protocol.name,
        type: SearchResultType.PROTOCOL,
        metadata: protocol.features,
      }));
    return {
      entries: [...assetsSearchResults, ...protocolsSearchResult],
    };
  }
}
