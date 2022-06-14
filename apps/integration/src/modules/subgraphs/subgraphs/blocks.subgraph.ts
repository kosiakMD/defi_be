import { map } from 'rxjs/operators';

import { HttpService, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Block } from '../dto/block.dto';

interface ResponseData {
  data: {
    blocks: Block[];
  };
}

@Injectable()
export class BlocksSubgraph {
  private readonly subgraphUrl: string;

  constructor(
    protected readonly configService: ConfigService,
    @Inject(HttpService) private readonly httpService: HttpService,
  ) {
    this.subgraphUrl = configService.get<string>('BLOCKS_SUBGRAPH_URL');
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
