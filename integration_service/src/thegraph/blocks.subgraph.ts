import { HttpService, Inject, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';

import { Block } from './blocks/block.dto';

@Injectable()
export class BlocksSubgraph {
  private subgraphUrl: string = process.env.BLOCKS_SUBGRAPH_URL;

  constructor(@Inject(HttpService) private readonly httpService: HttpService) {
  }

  async getFirstAfterTimestamp(ts: number): Promise<ResponseData> {
    return this.httpService
      .post<ResponseData>(this.subgraphUrl, {
        operationName: 'blocks',
        variables: {
          timestampFrom: ts,
        },
        query: `query blocks($timestampFrom: Int!) {
        blocks(
        	first: 1, 
        	orderBy: timestamp, 
        	orderDirection: asc, 
        	where: {timestamp_gt: $timestampFrom}
        	) {
						id
						number
        }
      }`,
      })
      .pipe(map((response) => response.data))
      .toPromise();
  }
}

interface ResponseData {
  data: {
    blocks: Block[];
  };
}
