import { plainToClass } from 'class-transformer';
import { map } from 'rxjs/operators';
import { AaveUser } from 'src/dto/liquidity.position.dto';

// import { SubgraphPairsResponseDto } from 'src/aave/dto';
// import { wrapInQuotes } from 'src/utils/string';
import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from 'src/common/enum';
import { Address } from 'src/common/types';

@Injectable()
export class AaveSubgraph {
  protected readonly subgraphUrls: { [key in keyof typeof ChainIdEnum]?: string };

  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrls = {
      [ChainIdEnum.eth]: this.configService.get<string>('AAVE_ETH_SUBGRAPH_URL'),
      [ChainIdEnum.plg]: this.configService.get<string>('AAVE_PLG_SUBGRAPH_URL'),
    };
  }

  getUsersReserves(userAddress: Address[], chainId: ChainIdEnum): Promise<any> {
    if (!this.subgraphUrls[chainId]) return Promise.resolve([]);

    return this.httpService
      .post(this.subgraphUrls[chainId], {
        operationName: 'GetUserReserves',
        variables: { users: userAddress },
        query: `query GetUserReserves($users: [ID!]!) {
          users(where: {id_in: $users}) {
            userAddress: id
            reserves {
              currentTotalDebt
              currentStableDebt
              currentVariableDebt
              currentATokenBalance
              reserve {
                id
                name
                underlyingAsset
                symbol
                decimals
                price {
                  priceInEth
                }
                liquidityRate
                stableBorrowRate
                variableBorrowRate
                aEmissionPerSecond
                vEmissionPerSecond
                sEmissionPerSecond
                totalATokenSupply
                totalCurrentVariableDebt
              }
            }
          }
        }`,
      })
      .pipe(map((response) => plainToClass(AaveUser, response.data.data.users)))
      .toPromise();
  }
}
