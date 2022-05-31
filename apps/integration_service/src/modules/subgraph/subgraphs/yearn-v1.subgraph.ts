import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainIdEnum } from '@app/common';

import { IYearnUser } from '../../protocol/protocols/yearn/yearn.interfaces';

@Injectable()
export class YearnV1Subgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.eth, this.configService.get<string>('YEARN_V1_ETH_SUBGRAPH_URL')],
    ]);
  }

  getSubgraphUrl(chain: ChainIdEnum) {
    return this.subgraphUrls.get(chain);
  }

  async getVaultPositions(addresses: Address[], chain: ChainIdEnum): Promise<IYearnUser[]> {
    const accounts = await this.httpService
      .post(this.getSubgraphUrl(chain), {
        variables: { addresses },
        query: `query getUserAccounts ($addresses: [String!]!) {
            accounts(where: { id_in: $addresses }) {
                id
                positions: vaultBalances(where: { shareBalance_gt: 0 } ) {
                    shareBalance
                    token: underlyingToken {
                        address: id
                        name
                        symbol
                        decimals
                    }
                    shareToken {
                        address: id
                        name
                        symbol
                        decimals
                    }
                    vault {
                      address: id
                      pricePerFullShare
                    }
                }
            }
        }`,
      })
      .pipe(map((response) => response.data.data.accounts as IYearnUser[]))
      .toPromise();

    return accounts as unknown as IYearnUser[];
  }
}
