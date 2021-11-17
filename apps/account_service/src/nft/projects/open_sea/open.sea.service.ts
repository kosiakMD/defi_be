import { PriceService } from 'apps/account_service/src/price/price.service';
import { BigNumber } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { RateLimiter } from 'limiter';
import { map } from 'rxjs/operators';

import { CACHE_MANAGER, HttpService, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainAbbrEnum, ChainIdEnum } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { ChainIdToAbbr } from '@app/common/constant/dictionaries';
import { CollectionDto, NftAssetDto, NftChainDto } from '@app/common/dto/nft';
import { NftProjectEnum } from '@app/common/enum/nft.enum';
import { NftAssetsByAccounts } from '@app/common/interfaces/nft.interface';
import { decimalsDivider } from '@app/common/utils/number';
import { groupBy, mapToObject, objectToMap } from '@app/common/utils/object';
import { getKey } from '@app/common/utils/string';

import { BasicNftService } from '../basic.nft.service';
import {
  NftAssetDto as OpenSeaNftAssetDto,
  OrderDto,
  CollectionDto as OpenSeaCollectionDto,
} from './dto';

interface Prices {
  priceUSD: number;
  priceNative: number;
}

export class OpenSeaService extends BasicNftService {
  public readonly project = NftProjectEnum.openSea;
  public readonly chains = [ChainAbbrEnum.eth];

  protected readonly url: string;
  private readonly API_KEY: string;

  private readonly limiter: RateLimiter;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly priceService: PriceService,
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super();
    this.url = this.configService.get<string>('OPEN_SEA_URL');
    this.API_KEY = this.configService.get<string>('OPEN_SEA_API_KEY');

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

  private async getRawAssetsByAccount(
    account: Address,
    limit: number,
    offset: number,
  ): Promise<OpenSeaNftAssetDto[]> {
    const cachedRawAsset = await this.cache.get<OpenSeaNftAssetDto[]>(
      this.getAssetKey(account, limit, offset),
    );

    if (cachedRawAsset) {
      return cachedRawAsset;
    }

    await this.limiter.removeTokens(1);

    const rawAsset = await this.httpService
      .get(this.getAssetsUrl(), {
        headers: {
          'X-API-KEY': this.API_KEY,
        },
        params: {
          owner: account,
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

    await this.cache.set(this.getAssetKey(account, limit, offset), rawAsset);

    return rawAsset;
  }

  private async getRawAsset(contract: Address, id: string): Promise<OpenSeaNftAssetDto> {
    const cachedRawAsset = await this.cache.get<OpenSeaNftAssetDto>(this.getAssetKey(contract, id));

    if (cachedRawAsset) {
      return cachedRawAsset;
    }

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
  }

  private getPriceFromOrders(orders: OrderDto[], owner?: Address): Prices {
    if (!orders.length)
      return {
        priceUSD: null,
        priceNative: null,
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
      let currentPriceUSD: string = null;
      const priceUSD = Math.max(
        ...orders.map(({ currentPrice, paymentToken: { decimals, priceUSD } }) => {
          currentPriceUSD = priceUSD || currentPriceUSD;
          return new BigNumber(currentPrice) //
            .div(decimalsDivider(decimals))
            .times(currentPriceUSD)
            .toNumber();
        }),
      );
      return {
        priceUSD,
        priceNative: priceUSD / +currentPriceUSD,
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
      priceUSD: null,
      priceNative: null,
    };
  }

  private mapAssets(
    assets: OpenSeaNftAssetDto[],
    chain: number,
    pricesByAssets: Map<string, { priceUSD: number; priceNative: number }>,
  ): NftChainDto {
    return {
      id: chain,
      abbr: ChainIdToAbbr[chain],
      collections: Array.from(
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

        const assets: NftAssetDto[] = value[1].map(({ name, tokenId, traits, imageUrl }) =>
          plainToClass(NftAssetDto, {
            id: tokenId,
            name,
            imageUrl,
            traits,
            priceNative:
              pricesByAssets.get(this.getAssetSeed(value[0], tokenId))?.priceNative || null,
            priceUSD: pricesByAssets.get(this.getAssetSeed(value[0], tokenId))?.priceUSD || null,
          }),
        );

        const averagePriceUSD = assets.reduce((acc, { priceUSD }) => acc + +priceUSD, 0);
        const averagePrice = assets.reduce((acc, { priceNative }) => acc + +priceNative, 0);

        return plainToClass(CollectionDto, {
          assets,
          address: value[0],
          name,
          symbol,
          description,
          averagePrice,
          averagePriceUSD,
          balance: assets.length,
          links: {
            site: externalUrl,
            image: imageUrl,
            bannerImage: bannerImageUrl,
          },
        });
      }),
    };
  }

  private async getAssetsByAccount(
    account: Address,
    chains: number[],
    limit: number,
    offset: number,
  ): Promise<NftAssetsByAccounts> {
    return {
      [account]: await Promise.all(
        chains.map(async (chain) => {
          const { prices } = await this.priceService.fetchTokenPrices(
            [ZERO_ADDRESS],
            ChainIdEnum.eth,
          );
          const pricesByAssets = new Map<string, { priceUSD: number; priceNative: number }>();

          const rawAssets = await this.getRawAssetsByAccount(account, limit, offset);

          const rawExtendedAssets = await Promise.all(
            rawAssets.map(
              async ({ contract: { address }, tokenId }) =>
                await this.getRawAsset(address, tokenId),
            ),
          );

          rawExtendedAssets.forEach(
            ({
              contract: { address },
              tokenId,
              orders,
              collection: {
                stats: { floorPrice },
              },
              lastSale,
            }) => {
              const lastSalePriceNative = new BigNumber(lastSale?.price)
                .div(decimalsDivider(lastSale?.paymentToken?.decimals))
                .toNumber();

              const lastSalePriceUSD = new BigNumber(lastSalePriceNative)
                .times(lastSale?.paymentToken?.priceUSD)
                .toNumber();

              const priceFromOrders = this.getPriceFromOrders(orders, account);
              const collectionPriceETH = floorPrice || null;

              pricesByAssets.set(this.getAssetSeed(address, tokenId), {
                priceUSD:
                  lastSalePriceUSD ||
                  priceFromOrders?.priceUSD ||
                  collectionPriceETH * prices[ZERO_ADDRESS],
                priceNative:
                  lastSalePriceNative || priceFromOrders?.priceNative || collectionPriceETH,
              });
            },
          );

          return this.mapAssets(rawExtendedAssets, chain, pricesByAssets);
        }),
      ),
    };
  }

  public async getAssetsByAccounts(
    accounts: Address[],
    chains: number[],
    limit: number,
    offset: number,
  ): Promise<NftAssetsByAccounts> {
    const rawAssetsByAccounts = await Promise.all(
      accounts.map((account) => this.getAssetsByAccount(account, chains, limit, offset)),
    );

    const assetsByAccounts = new Map<Address, NftChainDto[]>();

    rawAssetsByAccounts.forEach((assetsByAccount) => {
      objectToMap(assetsByAccount).forEach((assets, account) =>
        assetsByAccounts.set(account, assets),
      );
    });

    return mapToObject(assetsByAccounts);
  }
}
