import { BigNumber } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { map } from 'rxjs/operators';

import { CACHE_MANAGER, HttpService, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainIdEnum } from '@app/common';
import { ETH_ADDRESS } from '@app/common/constant';
import { AssetsByAccount } from '@app/common/interfaces/nft.interface';

import { PriceService } from '../price/price.service';
import { mapToObject, objectToMap } from '../utils/object';
import { getKey } from '../utils/string';
import { decimalsDivider } from '../utils/util';
import { AssetDto } from './dto';

export class OpenSeaService {
  private readonly API_ASSETS_LIMIT = 50;
  private readonly PRICE_TTL = 60;

  protected readonly url: string;
  protected readonly chainId = ChainIdEnum.eth;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly priceService: PriceService,
    protected readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    this.url = this.configService.get<string>('OPEN_SEA_URL');
  }

  private getAssetUrl(contract: Address, id: string) {
    return `${this.url}/asset/${contract}/${id}`;
  }

  private getAssetsUrl() {
    return `${this.url}/assets`;
  }

  private getPriceKey(...seed: Array<string | number>): string {
    return getKey('price', ...seed);
  }

  private async getAllAssetsByAccount(
    account: Address,
    assets: AssetDto[] = [],
    offset = 0,
    exit = false,
    limit = this.API_ASSETS_LIMIT,
  ): Promise<AssetDto[]> {
    if (exit) {
      return assets;
    }

    const chunkedAssets = await this.httpService
      .get(this.getAssetsUrl(), {
        params: {
          owner: account,
          limit,
          offset,
        },
      })
      .pipe(
        map((response) =>
          response.data.assets.map((asset: AssetDto) => plainToClass(AssetDto, asset)),
        ),
      )
      .toPromise();

    if (chunkedAssets.length) {
      return await this.getAllAssetsByAccount(
        account,
        [...assets, ...chunkedAssets],
        offset + limit,
      );
    } else {
      return await this.getAllAssetsByAccount(account, assets, offset, true);
    }
  }

  public async getAssetPrice(contract: Address, id: string): Promise<number> {
    try {
      const {
        collection: {
          stats: { floorPrice },
        },
        lastSale,
      } = await this.httpService
        .get(this.getAssetUrl(contract, id))
        .pipe(map((response) => plainToClass(AssetDto, response.data)))
        .toPromise();

      if (!lastSale || !+lastSale?.price) {
        let tokenPrice = await this.cache.get<number>(this.getPriceKey(ETH_ADDRESS, this.chainId));
        if (!tokenPrice) {
          const { prices } = await this.priceService.getTokenPrices([ETH_ADDRESS], this.chainId);
          tokenPrice = prices[ETH_ADDRESS];
          await this.cache.set<number>(this.getPriceKey(ETH_ADDRESS, this.chainId), tokenPrice, {
            ttl: this.PRICE_TTL,
          });
        }
        return new BigNumber(floorPrice) //
          .times(tokenPrice)
          .toNumber();
      }

      const {
        price,
        paymentToken: { decimals, price: paymentTokenPrice },
      } = lastSale;

      return new BigNumber(price) //
        .div(decimalsDivider(decimals))
        .times(paymentTokenPrice)
        .toNumber();
    } catch (e) {
      throw e.response.statusText;
    }
  }

  public async mapAssets(assets: AssetDto[]): Promise<AssetDto[]> {
    return await Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        priceUSD: await this.getAssetPrice(asset.contract.address, asset.tokenId),
      })),
    );
  }

  public async getAssetsByAccount(account: Address): Promise<AssetsByAccount> {
    return {
      [account]: await this.mapAssets(await this.getAllAssetsByAccount(account)),
    };
  }

  public async getAssetsByAccounts(accounts: Address[]): Promise<AssetsByAccount> {
    const rawAssetsByAccounts = await Promise.all(
      accounts.map((account) => this.getAssetsByAccount(account)),
    );

    const assetsByAccounts = new Map<Address, AssetDto[]>();

    rawAssetsByAccounts.forEach((assetsByAccount) => {
      objectToMap(assetsByAccount).forEach((assets, account) =>
        assetsByAccounts.set(account, assets),
      );
    });

    return mapToObject(assetsByAccounts);
  }
}
