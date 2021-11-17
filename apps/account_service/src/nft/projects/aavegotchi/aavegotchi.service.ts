import { PriceService } from 'apps/account_service/src/price/price.service';
import {
  GotchiOwned,
  Svg,
} from 'apps/account_service/src/thegraph/aavegotchi/aavegotchi.interface';
import { AavegotchiSubgraph } from 'apps/account_service/src/thegraph/aavegotchi/aavegotchi.subgraph';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import web3 from 'web3';

import { Injectable, CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainAbbrEnum, ChainIdEnum, NftProjectEnum } from '@app/common';
import { GHST_ADDRESS_POLYGON, ZERO_ADDRESS } from '@app/common/constant';
import { ChainIdToAbbr } from '@app/common/constant/dictionaries';
import {
  aavegotchiCollectionEthereum,
  aavegotchiCollectionPolygon,
  aavegotchiTraits,
} from '@app/common/constant/nft';
import { CollectionDto, NftAssetDto, NftChainDto } from '@app/common/dto/nft';
import { NftAssetsByAccounts } from '@app/common/interfaces/nft.interface';
import { mapToObject } from '@app/common/utils/object';
import { getKey } from '@app/common/utils/string';

import { BasicNftService } from '../basic.nft.service';
import { OpenSeaService } from '../open_sea/open.sea.service';

@Injectable()
export class AavegotchiService extends BasicNftService {
  public readonly project = NftProjectEnum.aavegotchi;
  public readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.plg];

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly configService: ConfigService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: AavegotchiSubgraph,
    protected readonly openSeaService: OpenSeaService,
  ) {
    super();
    BigNumber.config({ EXPONENTIAL_AT: 30 });
  }

  private getSvgKey(...ids: string[]): string {
    return getKey('nft', 'asset', 'svg', ...ids);
  }

  private async handleEthereum(
    accounts: Address[],
    chain: number,
    limit: number,
    offset: number,
  ): Promise<NftAssetsByAccounts[]> {
    const rawAssets = await this.openSeaService.getAssetsByAccounts(
      accounts,
      [chain],
      limit,
      offset,
    );
    const assetsByAccounts = new Map<Address, NftChainDto[]>();

    accounts.forEach((account) => {
      assetsByAccounts.set(
        account,
        rawAssets[account].map((chainData) => ({
          ...chainData,
          collections: chainData.collections.filter(
            ({ address }) => address === aavegotchiCollectionEthereum.address,
          ),
        })),
      );
    });

    return [mapToObject(assetsByAccounts)];
  }

  private mapPolygonAssets(
    assets: GotchiOwned[],
    ghstPrice: number,
    maticPrice: number,
  ): NftAssetDto[] {
    return assets.map(({ gotchiId, name, modifiedNumericTraits: traitsValues, listings }) => {
      const pricesInWei = listings.reduce((listings, listing) => {
        listing && listing.buyer && listings.push(+listing.priceInWei);
        return listings;
      }, []);

      const maxPriceInWei = Math.max(...pricesInWei);

      const priceUSD = Number.isInteger(maxPriceInWei)
        ? new BigNumber(web3.utils.fromWei(new BigNumber(maxPriceInWei).toString(), 'ether'))
            .times(ghstPrice)
            .toNumber()
        : null;

      const priceNative = +priceUSD / maticPrice;

      return plainToClass(NftAssetDto, {
        id: gotchiId,
        name,
        traits: traitsValues.map((value, key) => ({
          type: aavegotchiTraits[key],
          value,
        })),
        priceUSD,
        priceNative,
      });
    });
  }

  private async handlePolygon(
    accounts: Address[],
    chain: number,
    limit: number,
    offset: number,
  ): Promise<NftAssetsByAccounts[]> {
    const rawAssets = await this.subgraph.getUsers(accounts, chain);

    const { prices } = await this.priceService.fetchTokenPrices(
      [GHST_ADDRESS_POLYGON, ZERO_ADDRESS],
      chain,
    );

    return rawAssets.map(({ id: account, gotchisOwned }) => {
      const assets = this.mapPolygonAssets(
        gotchisOwned.slice(offset, offset + limit),
        prices[GHST_ADDRESS_POLYGON],
        prices[ZERO_ADDRESS],
      );
      const averagePrice =
        assets.reduce((acc, { priceNative }) => {
          return acc + +priceNative;
        }, 0) || null;

      const averagePriceUSD =
        assets.reduce((acc, { priceUSD }) => {
          return acc + +priceUSD;
        }, 0) || null;

      return {
        [account]: [
          plainToClass(NftChainDto, {
            id: chain,
            abbr: ChainIdToAbbr[chain],
            collections: [
              plainToClass(CollectionDto, {
                address: aavegotchiCollectionPolygon.address,
                assets,
                name: aavegotchiCollectionPolygon.name,
                symbol: aavegotchiCollectionPolygon.symbol,
                description: aavegotchiCollectionPolygon.description,
                averagePrice,
                averagePriceUSD,
                balance: assets.length,
                links: aavegotchiCollectionPolygon.links,
              }),
            ],
          }),
        ],
      };
    });
  }

  public async getAssetsByAccounts(
    accounts: Address[],
    chains: number[],
    limit: number,
    offset: number,
  ): Promise<NftAssetsByAccounts> {
    const assetsByAccounts = new Map<Address, NftChainDto[]>();
    const imagesByAssets = new Map<string, string>();
    const assetsIds = new Set<string>();

    const rawAssetsByAccounts = await Promise.all(
      chains.map(async (chain) => {
        switch (chain) {
          case ChainIdEnum.eth: {
            return await this.handleEthereum(accounts, chain, limit, offset);
          }

          case ChainIdEnum.plg: {
            return await this.handlePolygon(accounts, chain, limit, offset);
          }

          default: {
            return [];
          }
        }
      }),
    );

    accounts.forEach((account) => {
      rawAssetsByAccounts.flat().map((rawAssetsByChain) => {
        if (rawAssetsByChain[account]) {
          const prevAssetsByAccount = assetsByAccounts.get(account);

          if (prevAssetsByAccount) {
            assetsByAccounts.set(account, [...prevAssetsByAccount, ...rawAssetsByChain[account]]);
          } else {
            assetsByAccounts.set(account, rawAssetsByChain[account]);
          }
          rawAssetsByChain[account]?.forEach((chainData) => {
            chainData.collections.forEach((collection) => {
              collection.assets.forEach((asset) => assetsIds.add(asset.id));
            });
          });
        }
      });
    });

    const cachedSvgByAssets: Svg[] = await this.cache.get(this.getSvgKey(...assetsIds));

    if (cachedSvgByAssets) {
      cachedSvgByAssets.forEach((svgByAsset) => imagesByAssets.set(svgByAsset.id, svgByAsset.svg));
    } else {
      const svgByAssets = await this.subgraph.getSvg([...assetsIds]);
      svgByAssets.forEach((svgByAsset) => imagesByAssets.set(svgByAsset.id, svgByAsset.svg));

      await this.cache.set(this.getSvgKey(...assetsIds), svgByAssets);
    }

    accounts.forEach((account) => {
      const chainsData = assetsByAccounts.get(account);

      if (chainsData) {
        assetsByAccounts.set(
          account,
          chainsData.map((chainData) =>
            plainToClass(NftChainDto, {
              ...chainData,
              collections: chainData.collections.map((collection) =>
                plainToClass(CollectionDto, {
                  ...collection,
                  assets: collection.assets.map((asset) =>
                    plainToClass(NftAssetDto, {
                      ...asset,
                      imageSVG: imagesByAssets.get(asset.id),
                    }),
                  ),
                }),
              ),
            }),
          ),
        );
      }
    });

    return mapToObject(assetsByAccounts);
  }
}
