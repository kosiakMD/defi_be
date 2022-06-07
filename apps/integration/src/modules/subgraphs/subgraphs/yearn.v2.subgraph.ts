import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainIdEnum } from '@app/common';

import { IYearnUser } from '../../protocols/protocols/yearn/yearn.interfaces';

@Injectable()
export class YearnV2Subgraph {
  protected readonly subgraphUrls: Map<ChainIdEnum, string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.subgraphUrls = new Map([
      [ChainIdEnum.eth, this.configService.get<string>('YEARN_ETH_SUBGRAPH_URL')],
      [ChainIdEnum.ftm, this.configService.get<string>('YEARN_FTM_SUBGRAPH_URL')],
    ]);
  }

  getSubgraphUrl(chain: ChainIdEnum) {
    return this.subgraphUrls.get(chain);
  }

  async getVaultPositions(addresses: Address[], chain: ChainIdEnum): Promise<IYearnUser[]> {
    const users = await this.httpService
      .post(this.getSubgraphUrl(chain), {
        variables: { addresses },
        query: `query getUserAccounts ($addresses: [String!]!) {
            accounts(where: { id_in: $addresses }) {
                id
                positions: vaultPositions(where: { balancePosition_gt: 0 } ) {
                    balance: balancePosition
                    token {
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
                    }
                }
            }
        }`,
      })
      .pipe(map((response) => response.data.data.accounts as IYearnUser[]))
      .toPromise();

    return users.filter((user) => user.positions);
  }
}
