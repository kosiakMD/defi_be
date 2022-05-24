import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { IFetchPriceRequest } from '../../../common/interfaces/fetch.price.request.interface';
import { IFetchPriceResponse } from '../../../common/interfaces/fetch.price.response.interface';

import { INftPricesProvider } from './nft.prices.provider.interface';

interface CollectionStats {
  floorPrice: number;
}

interface TokenTransaction {
  [key: string]: {
    price: number;
    date: number;
  };
}

@Injectable()
export class LooksrarePricesProvider implements INftPricesProvider {
  readonly api;
  readonly subgraph;
  readonly name = this.constructor.name;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.api = configService.get('LOOKSRARE_API_URL');
    this.subgraph = configService.get('LOOKSRARE_SUBGRAPH_URL');
  }

  async fetchPrices(request: IFetchPriceRequest): Promise<IFetchPriceResponse> {
    const [collectionSet, tokenIdSet] = request.assets.reduce(
      (memo, { address, tokenId }) => {
        memo[0].add(address);
        memo[1].add(tokenId);
        return memo;
      },
      [new Set<string>(), new Set<string>()],
    );
    const collections = Array.from(collectionSet);
    const tokenIds = Array.from(tokenIdSet);

    //fetch floorPrices per collection
    //fetch transactions per tokenId
    const [stats, transactions] = await Promise.all([
      this.collectionStats(collections),
      this.transactions(collections, tokenIds),
    ]);

    //map results
    return {
      assets: request.assets.map(({ address, tokenId }) => {
        return {
          address: address,
          tokenId,
          floorPrice: stats.get(address)?.floorPrice || 0,
          lastPrice: transactions.get(address)?.[tokenId]?.price || 0,
          date: transactions.get(address)?.[tokenId]?.date || 0,
        };
      }),
    };
  }

  private async collectionStats(collections: string[]): Promise<Map<string, CollectionStats>> {
    const stats = await Promise.all(
      collections.map((collection) =>
        firstValueFrom(
          this.httpService.get(`${this.api}/api/v1/collections/stats?address=${collection}`),
        ),
      ),
    );
    const entries = stats
      .filter(({ data }) => !!data.data)
      .map<[string, CollectionStats]>(({ data }) => {
        return [
          data.data.address,
          {
            floorPrice: data.data.floorPrice,
          },
        ];
      });
    return new Map<string, CollectionStats>(entries);
  }

  private async transactions(
    collections: string[],
    tokenIds: string[],
  ): Promise<Map<string, TokenTransaction>> {
    const requestData = this.transactionsQuery(collections, tokenIds);
    const { data } = await firstValueFrom(this.httpService.post(this.subgraph, requestData));
    const resultMap = new Map<string, TokenTransaction>();
    //results are sorted by date;
    //since we need the latest price we'll keep it by overriding the value
    //in case we have more than 1 transaction per tokenId
    data.data.transactions.forEach(({ collection, tokenId, price, date }) => {
      const tokensTxs = resultMap.get(collection.id) || {};
      tokensTxs[tokenId] = { price, date };
      resultMap.set(collection.id, tokensTxs);
    });
    return resultMap;
  }

  private transactionsQuery(collections: string[], tokenIds: string[]) {
    return {
      variables: {
        collections,
        tokenIds,
      },
      query: `
        query transactionsQuery($collections: [String]!, $tokenIds: [String]!) {
          transactions(where: { collection_in: $collections, tokenId_in: $tokenIds }, orderBy: date) {
            collection {
              id
            }
            tokenId
            date
            price
          }
        }`,
    };
  }
}
