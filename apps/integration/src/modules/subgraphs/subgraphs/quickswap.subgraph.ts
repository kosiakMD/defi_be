import { map } from 'rxjs/operators';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { gql } from '@app/common/utils/graphql';

import { PairsDto } from '../dto/quickswap.subgraph.pairs.dto';
import { SubgraphResponseDto } from '../dto/subgraph.response.dto';

const MAX_PAIRS_PER_QUERY = 100;

@Injectable()
export class QuickswapSubgraph {
  protected readonly subgraphUrl: string;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrl = this.configService.get<string>('QUICKSWAP_SUBGRAPH_URL');
  }

  async getPairs(addresses: Address[]): Promise<SubgraphResponseDto<PairsDto>> {
    if (addresses.length > MAX_PAIRS_PER_QUERY) {
      throw new Error(
        `This endpoint returns ${MAX_PAIRS_PER_QUERY} responses maximum. Reduce your request size`,
      );
    }

    const pairs: SubgraphResponseDto<PairsDto> = await this.httpService
      .post(this.subgraphUrl, {
        variables: { addresses },
        query: gql`
          query getPairs($addresses: [String!]!) {
            pairs(where: { id_in: $addresses }) {
              id
              reserve0
              reserve1
              reserveUSD
              totalSupply
              token0Price
              token1Price
              token0 {
                id
                symbol
                name
                decimals
              }
              token1 {
                id
                symbol
                name
                decimals
              }
            }
          }
        `,
      })
      .pipe(map((response) => response.data))
      .toPromise();

    if (pairs.errors) {
      this.logger.error(pairs.errors);
    }

    return pairs;
  }
}
