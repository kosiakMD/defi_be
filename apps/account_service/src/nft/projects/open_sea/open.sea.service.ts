import { PriceService } from 'apps/account_service/src/price/price.service';
import { BigNumber } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { RateLimiter } from 'limiter';
import { map } from 'rxjs/operators';

import { CACHE_MANAGER, HttpService, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainAbbrEnum } from '@app/common';
import { ChainIdToAbbr } from '@app/common/constant/dictionaries';
import { CollectionDto, NftChainDto } from '@app/common/dto/nft';
import { NftProjectEnum } from '@app/common/enum/nft.enum';
import { NftAssetsByAccounts } from '@app/common/interfaces/nft.interface';
import { decimalsDivider } from '@app/common/utils/number';
import { groupBy, mapToObject, objectToMap } from '@app/common/utils/object';
import { getKey } from '@app/common/utils/string';

import { BasicNftService } from '../basic.nft.service';
import { NftAssetDto as OpenSeaNftAssetDto, OrderDto } from './dto';

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

  private getOrdersAveragePrice(orders: OrderDto[], owner?: Address): number {
    if (!orders.length) return null;

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

    const calculateAverage = (orders: OrderDto[]): number => {
      const prices: number[] = [];

      orders.forEach(({ currentPrice, paymentToken: { decimals, price } }) => {
        prices.push(
          new BigNumber(currentPrice) //
            .div(decimalsDivider(decimals))
            .times(price)
            .toNumber(),
        );
      });

      return (
        prices.reduce((accumulatedValue, currentValue) => accumulatedValue + currentValue, 0) /
        prices.length
      );
    };

    const { listings, offers } = filterOrders();

    if (listings.length) {
      return calculateAverage(listings);
    }

    if (offers.length) {
      return calculateAverage(offers);
    }

    return null;
  }

  private mapAssets(
    assets: OpenSeaNftAssetDto[],
    chain: number,
    pricesByAssets: Map<string, number>,
  ): NftChainDto {
    return {
      id: chain,
      abbr: ChainIdToAbbr[chain],
      collections: Array.from(
        groupBy(assets, (asset: OpenSeaNftAssetDto) => asset.contract.address),
      ).map((value) => {
        const { name, symbol, description, externalUrl, imageUrl, bannerImageUrl } =
          value[1][0].collection;
        const balance = value[1].length;

        return plainToClass(CollectionDto, {
          assets: value[1].map(({ name, tokenId, traits, imageUrl }) => ({
            id: tokenId,
            name,
            imageUrl,
            traits,
            priceUSD: pricesByAssets.get(this.getAssetSeed(value[0], tokenId)) || null,
          })),
          address: value[0],
          name,
          symbol,
          description,
          balance,
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
          const pricesByAssets = new Map<string, number>();

          const rawAssets = await this.getRawAssetsByAccount(account, limit, offset);

          const rawExtendedAssets = await Promise.all(
            rawAssets.map(
              async ({ contract: { address }, tokenId }) =>
                await this.getRawAsset(address, tokenId),
            ),
          );

          rawExtendedAssets.forEach(({ contract: { address }, tokenId, orders }) => {
            pricesByAssets.set(
              this.getAssetSeed(address, tokenId),
              this.getOrdersAveragePrice(orders, account),
            );
          });

          return this.mapAssets(rawAssets, chain, pricesByAssets);
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
