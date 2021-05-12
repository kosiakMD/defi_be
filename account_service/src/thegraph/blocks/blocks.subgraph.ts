import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { map } from 'rxjs/operators';

import { Block } from './block.interface';

@Injectable()
export class BlocksSubgraph {
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

export interface ResponseData {
  data: {
    blocks: Block[];
  };
}
