import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { isSomeAddress } from '@app/common/utils';
import { Web3NameService } from '@app/common/web3provider/web3.name.service';

import { AccountService } from '../account/account.service';
import { IntegrationService } from '../integration/integration.service';
import { SearchParams, SearchResults } from './search.interface';
import { addressSearchResultParser } from './search.utils';

@Injectable()
export class SearchService {
  constructor(
    private readonly accountService: AccountService,
    private readonly integrationService: IntegrationService,
    private readonly web3NameService: Web3NameService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  private async getSearchEntries(params: SearchParams): Promise<SearchResults> {
    const searchResults = await Promise.all([
      this.accountService.searchAssets(params),
      this.integrationService.searchProjects(params),
      this.integrationService.searchVaults(params),
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
      // try to resolve address (Ethereum or Solana)
      const address = await this.web3NameService.resolveName(text);
      if (address) {
        this.logger.debug(`Resolved address ${address}`);
        // try to search by address and by name
        const searchResult = await this.getSearchEntries({ address, text });
        return addressSearchResultParser(address, searchResult);
      }
    } catch (error) {
      this.logger.debug(`Error to resolve address ${error}`);
    }

    return this.getSearchEntries({ text });
  }
}
