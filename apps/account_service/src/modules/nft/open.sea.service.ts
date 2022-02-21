import { PriceService } from 'apps/account_service/src/common/providers/microservices/price/price.service';
import { BigNumber } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { isEthereumAddress } from 'class-validator';
import { RateLimiter } from 'limiter';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainAbbrEnum, ChainIdEnum, CurrentPricesPayload, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { ChainIdToAbbr, ChainIdToName } from '@app/common/constant/dictionaries';
import { ClusterThrottling } from '@app/common/decorators/cluster-throttling.decorator';
import { AsyncTimer } from '@app/common/decorators/time.decorators';
import {
  ChainCollectionsDto as NftChainDto,
  ChainsDto as NftChainsDto,
  CollectionBaseDto,
  CollectionChainsDto,
  CollectionDto,
  NftAssetDto,
} from '@app/common/dto/nft';
import { NftProjectEnum } from '@app/common/enum/nft.enum';
import {
  NftAssetsByAccounts,
  NftCollectionsByAccounts,
} from '@app/common/interfaces/nft.interface';
import { decimalsDivider } from '@app/common/utils/number';
import { groupBy, mapToObject, objectToMap, sumOfProperties } from '@app/common/utils/object';
import { getKey } from '@app/common/utils/string';

import { BaseCollectionDto, NftAssetDto as OpenSeaNftAssetDto, OrderDto } from '../../common/dto';

import { NftBasicService } from './nft.basic.service';

interface Prices {
  priceUsd: number;
  price: number;
}

const OPENSEA_FETCH_KEY = 'OpenSeaFetch';
const OPENSEA_FETCH_LIMIT = 1;
const OPENSEA_FETCH_TTL = 5;
const OPENSEA_FETCH_RETRY_TIME = 100;

export class OpenSeaService extends NftBasicService {
  public readonly project = NftProjectEnum.openSea;
  public readonly chains = [ChainAbbrEnum.eth];
  public readonly chainsIds = [ChainIdEnum.eth];

  protected readonly url: string;
  private readonly API_KEY: string;
  private readonly openSeaApiLimit: number;
  private readonly openSeaApiCollectionsLimit: number;

  private readonly limiter: RateLimiter;

  private readonly headers: Record<string, string | number>;

  // private refetch = 0;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly priceService: PriceService,
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super();
    this.url = this.configService.get<string>('OPEN_SEA_URL');
    this.API_KEY = this.configService.get<string>('OPEN_SEA_API_KEY');
    this.openSeaApiLimit = 50;
    this.openSeaApiCollectionsLimit = 300;

    this.headers = {
      'X-API-KEY': this.API_KEY,
    };

    this.limiter = new RateLimiter({
      tokensPerInterval: this.configService.get<number>('OPEN_SEA_INTERVAL'),
      interval: 'second',
    });
  }

  private static getAssetKey(...seed: Array<string | number>): string {
    return getKey('asset', ...seed);
  }

  private static getCollectionKey(...seed: Array<string | number>): string {
    return getKey('collection', ...seed);
  }

  private static getAssetSeed(contract: string, id?: string): string {
    return `${contract}/${id}`;
  }

  public async getCollectionsByAccounts(
    accounts: Address[],
    chains: ChainIdEnum[],
    collection?: string,
  ): Promise<NftCollectionsByAccounts> {
    const collectionsByAccounts = new Map<Address, CollectionChainsDto>();
    const rawCollectionsByAccounts = await Promise.all(
      accounts.map(async (account) =>
        isEthereumAddress(account)
          ? {
              [account]: await this.getRawCollectionsByAccount(account, collection),
            }
          : { [account]: [] },
      ),
    );

    rawCollectionsByAccounts.forEach((rawCollectionsByAccount) =>
      objectToMap(rawCollectionsByAccount).forEach((collections, account) => {
        return chains.forEach((chain) =>
          collectionsByAccounts.set(account, {
            chains: [
              {
                chain: {
                  id: chain,
                  abbr: ChainIdToAbbr[chain],
                  name: ChainIdToName[chain],
                },
                collections,
              },
            ],
          }),
        );
      }),
    );

    return mapToObject(collectionsByAccounts);
  }

  public async getAssetsByAccounts(
    accounts: Address[],
    collection: string,
    chains: number[],
  ): Promise<NftAssetsByAccounts> {
    const assetsByAccounts = new Map<Address, NftChainsDto>();

    const rawAssetsByAccounts = await Promise.all(
      accounts.map(async (account) => {
        assetsByAccounts.set(account, {
          chains: [],
          totalAccountPrice: null,
          totalAccountPriceUsd: null,
        });
        return isEthereumAddress(account)
          ? await this.getAssetsByAccount(account, collection, chains)
          : {};
      }),
    );
    rawAssetsByAccounts.forEach((assetsByAccount) => {
      objectToMap(assetsByAccount).forEach((assets, account) =>
        assetsByAccounts.set(account, assets),
      );
    });

    return mapToObject(assetsByAccounts);
  }

  private getAssetUrl(contract: Address, id: string) {
    return `${this.url}/asset/${contract}/${id}`;
  }

  private getAssetsUrl() {
    return `${this.url}/assets`;
  }

  private getCollectionsUrl() {
    return `${this.url}/collections`;
  }

  private mapCollections(collections: BaseCollectionDto[]): CollectionBaseDto[] {
    return collections.map(
      ({
        bannerImageUrl: bannerImage,
        slug,
        name,
        discordUrl,
        telegramUrl,
        twitterUsername,
        wikiUrl,
        mediumUsername,
        displayData,
        instagramUsername,
        imageUrl: image,
        symbol,
        externalUrl: site,
        description,
        permalink,
        contract,
        stats,
      }) => ({
        stats,
        description,
        links: {
          discordUrl,
          telegramUrl,
          wikiUrl,
          bannerImage,
          image,
          site,
          permalink,
        },
        displayData,
        usernames: {
          twitter: twitterUsername,
          instagram: instagramUsername,
          medium: mediumUsername,
        },
        name,
        slug,
        symbol,
        chain: ChainIdEnum.eth,
        project: this.project,
        tokenStandard: contract?.tokenStandard,
      }),
    );
  }

  private async fetchRawCollections(
    account: Address,
    offset: number,
    limit = this.openSeaApiCollectionsLimit,
  ): Promise<BaseCollectionDto[]> {
    try {
      await this.limiter.removeTokens(1);
      return await this.httpService
        .get(this.getCollectionsUrl(), {
          headers: this.headers,
          params: {
            // eslint-disable-next-line
            asset_owner: account,
            limit,
            offset,
          },
        })
        .pipe(map((response) => response.data.map(plainToClass.bind(this, BaseCollectionDto))))
        .toPromise();
    } catch (error) {
      this.logger.error(`Nft.fetchRawCollections OpenSea API error: ${error}`);
      throw error;
    }
  }

  private async getRawCollectionsByAccount(
    account: Address,
    collectionSlug: string,
  ): Promise<CollectionBaseDto[]> {
    const cachedRawCollections = await this.cache.get<CollectionBaseDto[]>(
      OpenSeaService.getCollectionKey(account),
    );

    if (cachedRawCollections) {
      return cachedRawCollections;
    }

    const rawCollections: CollectionBaseDto[] = [];

    let offset = 0;

    // eslint-disable-next-line
    while (true) {
      const fetchedRawCollections = this.mapCollections(
        await this.fetchRawCollections(account, offset),
      );
      rawCollections.push(
        ...fetchedRawCollections.filter(
          (collection) => !collectionSlug || collection.slug === collectionSlug,
        ),
      );
      if (fetchedRawCollections.length < this.openSeaApiCollectionsLimit) {
        break;
      }
      offset += this.openSeaApiCollectionsLimit;
    }

    await this.cache.set(OpenSeaService.getAssetKey(account), rawCollections);

    return rawCollections;
  }

  @ClusterThrottling(
    OPENSEA_FETCH_KEY,
    OPENSEA_FETCH_LIMIT,
    OPENSEA_FETCH_TTL,
    OPENSEA_FETCH_RETRY_TIME,
  )
  private async fetchRawAssets(
    owner: Address,
    collection: string,
    offset: number,
    limit = this.openSeaApiLimit,
  ): Promise<OpenSeaNftAssetDto[]> {
    // console.log('refetch', ++this.refetch);
    // const count = Number((await this.cache.get(OPENSEA_FETCH_KEY)) || 0);
    // console.log('count', count);
    // if (count >= 1) {
    //   // eslint-disable-next-line prefer-rest-params
    //   return new Promise((r) =>
    //     setTimeout(() => r(this.fetchRawAssets(owner, collection, offset, limit)), 200),
    //   );
    // } else {
    //   await this.cache.set(OPENSEA_FETCH_KEY, count + 1, { ttl: OPENSEA_FETCH_TTL });
    // }
    try {
      // await this.limiter.removeTokens(1);
      return await this.httpService
        .get(this.getAssetsUrl(), {
          headers: this.headers,
          params: {
            owner,
            limit,
            offset,
            collection,
          },
        })
        .pipe(
          map((response) =>
            response.data.assets.map((asset: OpenSeaNftAssetDto) =>
              plainToClass(OpenSeaNftAssetDto, asset),
            ),
          ),
        )
        .toPromise();
    } catch (error) {
      this.logger.error(`Nft.fetchRawAssets OpenSea API error: ${error}`);
      throw error;
      // } finally {
      //   const count = Number((await this.cache.get(OPENSEA_FETCH_KEY)) || 0);
      //   console.log('count2', count);
      //   // const nextCount = count ? count - 1 : 0;
      //   const nextCount = 1;
      //   console.log('nextCount', nextCount);
      //   this.refetch = 0;
      //   await this.cache.set(OPENSEA_FETCH_KEY, nextCount, { ttl: OPENSEA_FETCH_TTL });
    }
  }

  @AsyncTimer()
  private async getRawAssetsByAccount(
    account: Address,
    collection: string,
  ): Promise<OpenSeaNftAssetDto[]> {
    // const cachedRawAssets = await this.cache.get<OpenSeaNftAssetDto[]>(
    //   OpenSeaService.getAssetKey(account, collection),
    // );
    //
    // if (cachedRawAssets) {
    //   return cachedRawAssets;
    // }
    //
    // const rawAssets: OpenSeaNftAssetDto[] = [];
    //
    // let offset = 0;
    //
    // eslint-disable-next-line
    // while (true) {
    //   const fetchedRawAssets = await this.fetchRawAssets(account, collection, offset);
    //   console.log('fetchedRawAssets.length', fetchedRawAssets.length);
    //   console.log('this.openSeaApiLimit', this.openSeaApiLimit);
    //   rawAssets.push(...fetchedRawAssets);
    //   if (fetchedRawAssets.length < this.openSeaApiLimit) {
    //     break;
    //   }
    //   offset += this.openSeaApiLimit;
    // }
    //
    // await this.cache.set(OpenSeaService.getAssetKey(account, collection), rawAssets);

    // TODO:
    const rawAssets: OpenSeaNftAssetDto[] = await this.fetchRawAssets(account, collection, 0);

    return rawAssets;
  }

  private async getRawAsset(contract: Address, id: string): Promise<OpenSeaNftAssetDto> {
    const cachedRawAsset = await this.cache.get<OpenSeaNftAssetDto>(
      OpenSeaService.getAssetKey(contract, id),
    );

    if (cachedRawAsset) {
      return cachedRawAsset;
    }
    try {
      await this.limiter.removeTokens(1);

      const rawAsset = await this.httpService
        .get(this.getAssetUrl(contract, id), {
          headers: this.headers,
        })
        .pipe(map((response) => plainToClass(OpenSeaNftAssetDto, response.data)))
        .toPromise();

      await this.cache.set(OpenSeaService.getAssetKey(contract, id), rawAsset);

      return rawAsset;
    } catch (error) {
      this.logger.error(`Nft.getRawAsset OpenSea API error: ${error}`);
      throw error;
    }
  }

  private getPriceFromOrders(orders: OrderDto[], owner?: Address): Prices {
    if (!orders.length)
      return {
        priceUsd: null,
        price: null,
      };

    const filterOrders = (): { listings: OrderDto[]; offers: OrderDto[] } => {
      const activeOrders = orders.filter(
        ({ closingDate }) => new Date(closingDate).getTime() > Date.now(),
      );

      const listings = activeOrders.filter(
        ({ maker: { address } }) => address.toLocaleLowerCase() === owner?.toLocaleLowerCase(),
      );

      const offers = activeOrders.filter(
        ({ maker: { address } }) => address.toLocaleLowerCase() !== owner?.toLocaleLowerCase(),
      );

      return { listings, offers };
    };

    const calculateMax = (orders: OrderDto[]): Prices => {
      let currentPriceUsd: string = null;
      const priceUsd = Math.max(
        ...orders.map(({ currentPrice, paymentToken: { decimals, priceUsd } }) => {
          currentPriceUsd = priceUsd || currentPriceUsd;
          return new BigNumber(currentPrice) //
            .div(decimalsDivider(decimals))
            .times(currentPriceUsd)
            .toNumber();
        }),
      );
      return {
        priceUsd,
        price: priceUsd / +currentPriceUsd,
      };
    };

    const { listings, offers } = filterOrders();

    if (listings.length) {
      return calculateMax(listings);
    }

    if (offers.length) {
      return calculateMax(offers);
    }

    return {
      priceUsd: null,
      price: null,
    };
  }

  private mapAssets(
    assets: OpenSeaNftAssetDto[],
    chain: number,
    pricesByAssets: Map<string, { priceUsd: number; price: number }>,
  ): NftChainDto {
    const collections = Array.from(
      groupBy(assets, (asset: OpenSeaNftAssetDto) => asset.contract.address),
    ).map((value: [string, [OpenSeaNftAssetDto]]) => {
      const {
        permalink,
        contract,
        collection: {
          name,
          symbol,
          description,
          externalUrl,
          imageUrl,
          bannerImageUrl,
          discordUrl,
          displayData,
          instagramUsername,
          mediumUsername,
          telegramUrl,
          stats,
          twitterUsername,
          wikiUrl,
          slug,
        },
      } = value[1][0];

      const assets: NftAssetDto[] = value[1].map(({ name, tokenId, traits, imageUrl }) => {
        const pricesByAsset = pricesByAssets.get(OpenSeaService.getAssetSeed(value[0], tokenId));

        return plainToClass(NftAssetDto, {
          id: tokenId,
          name,
          imageUrl,
          traits: traits.map((trait) => ({
            ...trait,
            percentageOfOwners: (trait.count * 100) / stats.count,
          })),
          price: pricesByAsset?.price || null,
          priceUsd: pricesByAsset?.priceUsd || null,
        });
      });

      const { totalCollectionPrice, totalCollectionPriceUsd } = sumOfProperties(
        assets,
        ['price', 'priceUsd'],
        ['totalCollectionPrice', 'totalCollectionPriceUsd'],
      );

      return plainToClass(CollectionDto, {
        chain,
        assets,
        address: value[0],
        name,
        symbol,
        description,
        slug,
        stats,
        totalCollectionPrice: totalCollectionPrice || null,
        totalCollectionPriceUsd: totalCollectionPriceUsd || null,
        balance: assets.length,
        project: this.project,
        usernames: {
          medium: mediumUsername,
          twitter: twitterUsername,
          instagram: instagramUsername,
        },
        displayData,
        tokenStandard: contract?.tokenStandard,
        links: {
          site: externalUrl,
          image: imageUrl,
          bannerImage: bannerImageUrl,
          telegramUrl,
          wikiUrl,
          discordUrl,
          permalink,
        },
      });
    });

    const { totalChainPrice, totalChainPriceUsd } = sumOfProperties(
      collections,
      ['totalCollectionPrice', 'totalCollectionPriceUsd'],
      ['totalChainPrice', 'totalChainPriceUsd'],
    );

    return plainToClass(NftChainDto, {
      chain: {
        id: chain,
        abbr: ChainIdToAbbr[chain],
        name: ChainIdToName[chain],
      },
      totalChainPrice: totalChainPrice || null,
      totalChainPriceUsd: totalChainPriceUsd || null,
      collections,
    });
  }

  private mapChains(
    chainsIds: number[],
    account: Address,
    assets: OpenSeaNftAssetDto[],
    prices: CurrentPricesPayload,
  ): NftChainDto[] {
    return chainsIds.map((chain) => {
      const pricesByAssets = new Map<string, Prices>();

      assets.forEach(
        ({
          contract: { address },
          tokenId,
          orders,
          collection: {
            stats: { floorPrice },
          },
          lastSale,
        }) => {
          const lastSalePrice = new BigNumber(lastSale?.price)
            .div(decimalsDivider(lastSale?.paymentToken?.decimals))
            .toNumber();

          const lastSalePriceUsd = new BigNumber(lastSalePrice)
            .times(lastSale?.paymentToken?.priceUsd)
            .toNumber();

          const priceFromOrders = this.getPriceFromOrders(orders, account);
          const collectionPriceEth = floorPrice || null;

          pricesByAssets.set(OpenSeaService.getAssetSeed(address, tokenId), {
            priceUsd:
              lastSalePriceUsd ||
              priceFromOrders?.priceUsd ||
              collectionPriceEth * prices[ZERO_ADDRESS],
            price: lastSalePrice || priceFromOrders?.price || collectionPriceEth,
          });
        },
      );

      return this.mapAssets(assets, chain, pricesByAssets);
    });
  }

  private async getAssetsByAccount(
    account: Address,
    collection: string,
    chainsIds: number[],
  ): Promise<NftAssetsByAccounts> {
    const { prices } = await this.priceService.fetchTokenPrices([ZERO_ADDRESS], ChainIdEnum.eth);

    const rawAssets = await this.getRawAssetsByAccount(account, collection);

    const rawExtendedAssets = await Promise.all(
      rawAssets.map(
        async ({ contract: { address }, tokenId }) => await this.getRawAsset(address, tokenId),
      ),
    );

    const chains = this.mapChains(chainsIds, account, rawExtendedAssets, prices);

    const { totalAccountPrice, totalAccountPriceUsd } = sumOfProperties(
      chains,
      ['totalChainPrice', 'totalChainPriceUsd'],
      ['totalAccountPrice', 'totalAccountPriceUsd'],
    );

    return {
      [account]: {
        totalAccountPrice: totalAccountPrice || null,
        totalAccountPriceUsd: totalAccountPriceUsd || null,
        chains,
      },
    };
  }
}
