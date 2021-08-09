import { map } from 'rxjs/operators';

import { HttpService, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  async getLastBlocks(blocksCount: number): Promise<ResponseData> {
    return this.httpService
      .post<ResponseData>(this.subgraphUrl, {
        operationName: 'blocks',
        variables: {
          blocksCount: blocksCount,
        },
        query: `query blocks($blocksCount: Int!) {
					blocks(first: $blocksCount, skip: 0, orderBy: number, orderDirection: desc) {
						id
						number
						timestamp
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
