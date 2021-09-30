import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UniswapV3Position, ChainIdEnum, Address } from '@app/common';

interface UniswapGraphQLPositionResponse {
  positions: UniswapV3Position[];
}

@Injectable()
export class UniswapV3Subgraph {
  protected readonly subgraphUrls: { [key in keyof typeof ChainIdEnum]?: string };

  constructor(
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    this.subgraphUrls = {
      [ChainIdEnum.eth]: this.configService.get<string>('AMM_UNISWAP_V3_ETH_SUBGRAPH_URL'),
    };
  }

  protected getChainSubgraphEndpoint(chainId: ChainIdEnum): string {
    return this.subgraphUrls[chainId.toString()];
  }

  async getPositions(
    address: Address,
    chainId: ChainIdEnum,
  ): Promise<UniswapGraphQLPositionResponse> {
    return this.httpService
      .post(this.getChainSubgraphEndpoint(chainId), {
        variables: { address },
        query: `
        query GetUserPositions($address: Bytes!) {
          positions(where: { owner: $address }) {
            owner
            tokenId:id
            liquidity
            feeGrowthInside0LastX128
            feeGrowthInside1LastX128
            tickLower {
              tickIdx
              feeGrowthOutside0X128
              feeGrowthOutside1X128
            }
            tickUpper {
              tickIdx
              feeGrowthOutside0X128
              feeGrowthOutside1X128
            }
            token0 {
              address: id
              name
              symbol
              decimals
              totalSupply
            }
            token1 {
              address: id
              name
              symbol
              decimals
              totalSupply
            }
            pool {
              id
              liquidity
              sqrtPrice
              tick
              totalValueLockedToken0
              totalValueLockedToken1
              totalValueLockedUSD
              feeGrowthGlobal0X128
              feeGrowthGlobal1X128
            }
          }
        }
      `,
      })
      .pipe(map((response) => response.data.data))
      .toPromise();
  }
}
