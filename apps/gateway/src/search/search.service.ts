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
import { SearchParams, SearchResults, SearchResultsBaseEntry } from './interfaces/search.interface';

@Injectable()
export class SearchService extends BaseService {
  private readonly assetsUrl: string;
  private readonly integrationUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected httpService: HttpService,
    protected configService: ConfigService,
    private readonly web3NameService: Web3NameService,
  ) {
    super(logger, httpService, configService);

    this.assetsUrl = this.getServiceUrl(ServiceEnum.Assets);
    this.integrationUrl = this.getServiceUrl(ServiceEnum.Integration);
  }

  public async getAddressSuggestions(query: SearchQueryDto): Promise<AddressSuggestionDto[]> {
    const { text } = query;
    if (isSomeAddress(text)) {
      return [new AddressSuggestionDto(text)];
    }
    return this.tryToResolveAddress(query);
  }

  public async search(query: SearchQueryDto): Promise<SearchResults> {
    const { text } = query;
    return this.getSearchEntries({
      ...query,
      ...(isSomeAddress(text) ? { addresses: [text] } : {}),
    });
  }

  private async tryToResolveAddress(query: SearchQueryDto): Promise<AddressSuggestionDto[]> {
    const { text } = query;
    const substitution = text.endsWith('.') ? text.slice(0, -1) : text;
    let promises = [
      this.web3NameService.resolveNameResponseWithName(`${substitution}.eth`.toLowerCase()),
      this.web3NameService.resolveNameResponseWithName(`${substitution}.tns`.toLowerCase()),
      this.web3NameService.resolveNameResponseWithName(`${substitution}.tns`.toUpperCase()),
      this.web3NameService.resolveNameResponseWithName(`${substitution}.ust`.toLowerCase()),
      this.web3NameService.resolveNameResponseWithName(`${substitution}.ust`.toUpperCase()),
    ];
    const postfix = text.toLowerCase().slice(-4);
    promises = promises.concat([
      ...(postfix === '.eth' || text.toLowerCase() === 'eth'
        ? []
        : [this.web3NameService.resolveNameResponseWithName(text.toUpperCase())]),
      this.web3NameService.resolveNameResponseWithName(text.toLowerCase()),
    ]);
    const addresses = await Promise.all(promises);
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
    const assetsSearchUrl = new URL('v1/assets/search', this.assetsUrl);
    const protocolsSearchUrl = new URL('v1/protocols', this.integrationUrl);
    const promises = [
      this.requestProxy(assetsSearchUrl.toString(), 'GET', { params }),
      this.requestProxy(protocolsSearchUrl.toString()),
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
