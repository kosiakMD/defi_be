import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, ChainIdEnum, Logger } from '@app/common';

import { ICompoundAccountResponse } from '../../protocols/protocols/compound/compound.interfaces';
import { getCompoundAccountQuery } from '../../protocols/protocols/compound/queries/account.query';

@Injectable()
export class CompoundSubgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.eth, this.configService.get<string>('COMPOUND_ETH_SUBGRAPH_URL')],
    ]);
  }

  isSupportedChain(chain: ChainDto): boolean {
    return this.subgraphUrls.has(chain.id);
  }

  getSubgraphUrl(chain: ChainDto): string {
    return this.subgraphUrls.get(chain.id);
  }

  async getUserData(addresses: Address[], chain: ChainDto): Promise<ICompoundAccountResponse> {
    if (!this.isSupportedChain(chain)) return;

    const response$ = this.httpService.post(this.getSubgraphUrl(chain), {
      variables: { addresses },
      query: getCompoundAccountQuery,
    });

    const response = await firstValueFrom(response$);

    return {
      errors: response.data.errors?.map(({ message }) => message),
      accounts: response.data.data?.accounts,
    };
  }
}
