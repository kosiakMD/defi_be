import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ResponseData } from './interfaces/transfers.block.interface';

export class TransfersBlocksSubgraph {
  protected subgraphUrl: string;
  constructor(
    protected readonly httpService: HttpService,
    protected readonly configService: ConfigService,
  ) {
    this.subgraphUrl = this.configService.get<string>('BLOCKS_SUBGRAPH_URL');
  }
  async getBlocksTimestamps(blockNumbers: number[]): Promise<ResponseData> {
    return this.httpService
      .post<ResponseData>(this.subgraphUrl, {
        operationName: 'blocks',
        variables: {
          blockNumbers: blockNumbers,
        },
        query: `query blocks($blockNumbers: [Int]) {
          blocks (where:{number_in:$blockNumbers}) {
              number
              timestamp
          }
        }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }
}
