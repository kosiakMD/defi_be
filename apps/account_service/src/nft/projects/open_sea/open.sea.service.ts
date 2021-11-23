import { PriceService } from 'apps/account_service/src/price/price.service';
import { BigNumber } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { RateLimiter } from 'limiter';
import { map } from 'rxjs/operators';

import { CACHE_MANAGER, HttpService, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainAbbrEnum, ChainIdEnum, CurrentPricesPayload, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { ChainIdToAbbr, ChainIdToName } from '@app/common/constant/dictionaries';
import {
  CollectionDto,
  NftAssetDto,
  ChainDto as NftChainDto,
  ChainsDto as NftChainsDto,
} from '@app/common/dto/nft';
import { NftProjectEnum } from '@app/common/enum/nft.enum';
import { NftAssetsByAccounts } from '@app/common/interfaces/nft.interface';
import { decimalsDivider } from '@app/common/utils/number';
import { groupBy, mapToObject, objectToMap, sumOfProperties } from '@app/common/utils/object';
import { getKey } from '@app/common/utils/string';

import { BasicNftService } from '../basic.nft.service';
import {
  NftAssetDto as OpenSeaNftAssetDto,
  OrderDto,
  CollectionDto as OpenSeaCollectionDto,
} from './dto';

interface Prices {
  priceUsd: number;
  price: number;
}

export class OpenSeaService extends BasicNftService {
  public readonly project = NftProjectEnum.openSea;
  public readonly chains = [ChainAbbrEnum.eth];

  protected readonly url: string;
  private readonly API_KEY: string;
  private readonly openSeaApiLimit: number;

  private readonly limiter: RateLimiter;

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

    this.limiter = new RateLimiter({
      tokensPerInterval: this.configService.get<number>('OPEN_SEA_INTERVAL'),
      interval: 'second',
    });
  }

  private getAssetUrl(contract: Address, id: string) {
    return `${this.url}/asset/${contract}/${id}`;
  }

  private getAssetsUrl() {
    return `${this.url}/assets`;
  }

  private getAssetKey(...seed: Array<string | number>): string {
    return getKey('asset', ...seed);
  }

  private getAssetSeed(contract: string, id?: string): string {
    return `${contract}/${id}`;
  }

  private async fetchRawAssets(
    owner: Address,
    offset: number,
    limit = this.openSeaApiLimit,
  ): Promise<OpenSeaNftAssetDto[]> {
    try {
      await this.limiter.removeTokens(1);
      return await this.httpService
        .get(this.getAssetsUrl(), {
          headers: {
            'X-API-KEY': this.API_KEY,
          },
          params: {
            owner,
            limit,
            offset,
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
    }
  }

  private async getRawAssetsByAccount(account: Address): Promise<OpenSeaNftAssetDto[]> {
    const cachedRawAssets = await this.cache.get<OpenSeaNftAssetDto[]>(this.getAssetKey(account));

    if (cachedRawAssets) {
      return cachedRawAssets;
    }

    const rawAssets: OpenSeaNftAssetDto[] = [];

    let offset = 0;

    // eslint-disable-next-line
    while (true) {
      const fetchedRawAssets = await this.fetchRawAssets(account, offset);
      rawAssets.push(...fetchedRawAssets);
      if (fetchedRawAssets.length < this.openSeaApiLimit) {
        break;
      }
      offset += this.openSeaApiLimit;
    }

    await this.cache.set(this.getAssetKey(account), rawAssets);

    return rawAssets;
  }

  private async getRawAsset(contract: Address, id: string): Promise<OpenSeaNftAssetDto> {
    const cachedRawAsset = await this.cache.get<OpenSeaNftAssetDto>(this.getAssetKey(contract, id));

    if (cachedRawAsset) {
      return cachedRawAsset;
    }
    try {
      await this.limiter.removeTokens(1);

      const rawAsset = await this.httpService
        .get(this.getAssetUrl(contract, id), {
          headers: {
            'X-API-KEY': this.API_KEY,
          },
        })
        .pipe(map((response) => plainToClass(OpenSeaNftAssetDto, response.data)))
        .toPromise();

      await this.cache.set(this.getAssetKey(contract, id), rawAsset);

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
    ).map((value) => {
      const {
        name,
        symbol,
        description,
        externalUrl,
        imageUrl,
        bannerImageUrl,
      }: OpenSeaCollectionDto = value[1][0].collection;

      const assets: NftAssetDto[] = value[1].map(({ name, tokenId, traits, imageUrl }) => {
        const pricesByAsset = pricesByAssets.get(this.getAssetSeed(value[0], tokenId));
        return plainToClass(NftAssetDto, {
          id: tokenId,
          name,
          imageUrl,
          traits,
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
        chain: chain,
        assets,
        address: value[0],
        name,
        symbol,
        description,
        totalCollectionPrice: totalCollectionPrice || null,
        totalCollectionPriceUsd: totalCollectionPriceUsd || null,
        balance: assets.length,
        links: {
          site: externalUrl,
          image: imageUrl,
          bannerImage: bannerImageUrl,
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

          pricesByAssets.set(this.getAssetSeed(address, tokenId), {
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
    chainsIds: number[],
  ): Promise<NftAssetsByAccounts> {
    const { prices } = await this.priceService.fetchTokenPrices([ZERO_ADDRESS], ChainIdEnum.eth);

    const rawAssets = await this.getRawAssetsByAccount(account);

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

  public async getAssetsByAccounts(
    accounts: Address[],
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
        return await this.getAssetsByAccount(account, chains);
      }),
    );
    rawAssetsByAccounts.forEach((assetsByAccount) => {
      objectToMap(assetsByAccount).forEach((assets, account) =>
        assetsByAccounts.set(account, assets),
      );
    });

    return mapToObject(assetsByAccounts);
  }
}
