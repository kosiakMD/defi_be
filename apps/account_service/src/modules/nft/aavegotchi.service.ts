import { PriceService } from 'apps/account_service/src/common/providers/microservices/price/price.service';
import {
  GotchiOwned,
  Svg,
} from 'apps/account_service/src/modules/nft/interfaces/aavegotchi.interface';
import { AavegotchiSubgraph } from 'apps/account_service/src/modules/nft/subgraphes/aavegotchi/aavegotchi.subgraph';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import web3 from 'web3';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainAbbrEnum, ChainIdEnum, NftProjectEnum } from '@app/common';
import { GHST_ADDRESS_POLYGON, ZERO_ADDRESS } from '@app/common/constant';
import { ChainIdToAbbr, ChainIdToName } from '@app/common/constant/dictionaries';
import { aavegotchiCollectionPolygon, aavegotchiTraits } from '@app/common/constant/nft';
import {
  ChainDto as NftChainDto,
  ChainsDto as NftChainsDto,
  CollectionDto,
  NftAssetDto,
} from '@app/common/dto/nft';
import { NftAssetsByAccounts } from '@app/common/interfaces/nft.interface';
import { mapToObject, sumOfProperties } from '@app/common/utils/object';
import { getKey } from '@app/common/utils/string';

import { NftBasicService } from './nft.basic.service';
import { OpenSeaService } from './open.sea.service';

export class AavegotchiService extends NftBasicService {
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

  private static getSvgKey(...ids: string[]): string {
    return getKey('nft', 'asset', 'svg', ...ids);
  }

  private async handleEthereum(accounts: Address[], chain: number): Promise<NftAssetsByAccounts[]> {
    return [await this.openSeaService.getAssetsByAccounts(accounts, [chain])];
  }

  private mapPolygonAssets(
    assets: GotchiOwned[],
    imagesByAssets: Map<string, string>,
    ghstPrice: number,
    maticPrice: number,
  ): NftAssetDto[] {
    return assets.map(({ gotchiId, name, modifiedNumericTraits: traitsValues, listings }) => {
      const priceInWei = listings.reduce(
        (previousListing, listing) => {
          return new Date(+listing.timePurchased) > new Date(+previousListing.timePurchased) &&
            listing.buyer
            ? listing
            : previousListing;
        },
        {
          seller: null,
          buyer: null,
          timePurchased: null,
          priceInWei: null,
        },
      ).priceInWei;

      const priceUsd =
        priceInWei !== null
          ? new BigNumber(web3.utils.fromWei(priceInWei, 'ether')).times(ghstPrice)
          : null;

      const price = +priceUsd / maticPrice;

      return plainToClass(NftAssetDto, {
        id: gotchiId,
        name,
        traits: traitsValues.map((value, key) => ({
          type: aavegotchiTraits[key],
          value,
        })),
        price,
        priceUsd,
        imageSvg: imagesByAssets.get(gotchiId),
      });
    });
  }

  private static mapPolygonCollection(assets: NftAssetDto[]): CollectionDto {
    const { totalCollectionPrice, totalCollectionPriceUsd } = sumOfProperties(
      assets,
      ['price', 'priceUsd'],
      ['totalCollectionPrice', 'totalCollectionPriceUsd'],
    );

    return plainToClass(CollectionDto, {
      address: aavegotchiCollectionPolygon.address,
      chain: ChainIdEnum.plg,
      assets,
      name: aavegotchiCollectionPolygon.name,
      symbol: aavegotchiCollectionPolygon.symbol,
      description: aavegotchiCollectionPolygon.description,
      totalCollectionPrice: totalCollectionPrice || null,
      totalCollectionPriceUsd: totalCollectionPriceUsd || null,
      balance: assets.length,
      links: aavegotchiCollectionPolygon.links,
    });
  }

  private async handlePolygon(accounts: Address[], chain: number): Promise<NftAssetsByAccounts[]> {
    const imagesByAssets = new Map<string, string>();

    const rawAssets = await this.subgraph.getUsers(accounts);

    const { prices } = await this.priceService.fetchTokenPrices(
      [GHST_ADDRESS_POLYGON, ZERO_ADDRESS],
      chain,
    );

    return await Promise.all(
      rawAssets.map(async ({ id: account, gotchisOwned }) => {
        const gotchisIds = gotchisOwned.map(({ gotchiId }) => gotchiId);

        await Promise.all(
          gotchisIds.map(async (gotchiId) => {
            const cachedSvgByAsset: Svg = await this.cache.get(
              AavegotchiService.getSvgKey(gotchiId),
            );

            if (cachedSvgByAsset) {
              imagesByAssets.set(cachedSvgByAsset.id, cachedSvgByAsset.svg);
            } else {
              const svgByAsset = await this.subgraph.getSvg([gotchiId]);
              svgByAsset.forEach((svgByAsset) => imagesByAssets.set(svgByAsset.id, svgByAsset.svg));

              await this.cache.set(AavegotchiService.getSvgKey(gotchiId), svgByAsset);
            }
          }),
        );

        const assets = this.mapPolygonAssets(
          gotchisOwned,
          imagesByAssets,
          prices[GHST_ADDRESS_POLYGON],
          prices[ZERO_ADDRESS],
        );

        const collection = AavegotchiService.mapPolygonCollection(assets);

        const { totalAccountPrice, totalAccountPriceUsd } = sumOfProperties(
          [collection],
          ['totalCollectionPrice', 'totalCollectionPriceUsd'],
          ['totalAccountPrice', 'totalAccountPriceUsd'],
        );

        return {
          [account]: {
            totalAccountPrice: totalAccountPrice || null,
            totalAccountPriceUsd: totalAccountPriceUsd || null,
            chains: [
              plainToClass(NftChainDto, {
                chain: {
                  id: chain,
                  abbr: ChainIdToAbbr[chain],
                  name: ChainIdToName[chain],
                },
                totalChainPrice: collection.totalCollectionPrice || null,
                totalChainPriceUsd: collection.totalCollectionPriceUsd || null,
                collections: [collection],
              }),
            ],
          },
        };
      }),
    );
  }

  public async getAssetsByAccounts(
    accounts: Address[],
    chains: number[],
  ): Promise<NftAssetsByAccounts> {
    const assetsByAccounts = new Map<Address, NftChainsDto>();
    const assetsIds = new Set<string>();

    const rawAssetsByAccounts = await Promise.all(
      chains.map(async (chain) => {
        switch (chain) {
          case ChainIdEnum.eth: {
            return await this.handleEthereum(accounts, chain);
          }

          case ChainIdEnum.plg: {
            return await this.handlePolygon(accounts, chain);
          }

          default: {
            return [];
          }
        }
      }),
    );

    accounts.forEach((account) => {
      assetsByAccounts.set(account, {
        chains: [],
        totalAccountPrice: null,
        totalAccountPriceUsd: null,
      });

      rawAssetsByAccounts.flat().map((rawAssetsByChain) => {
        if (rawAssetsByChain[account]) {
          const prevAssetsByAccount = assetsByAccounts.get(account);
          const chains = [
            ...(prevAssetsByAccount?.chains || []),
            ...rawAssetsByChain[account].chains,
          ];

          const { totalAccountPrice, totalAccountPriceUsd } = sumOfProperties(
            chains,
            ['totalChainPrice', 'totalChainPriceUsd'],
            ['totalAccountPrice', 'totalAccountPriceUsd'],
          );

          assetsByAccounts.set(account, {
            chains: chains,
            totalAccountPrice: totalAccountPrice || null,
            totalAccountPriceUsd: totalAccountPriceUsd || null,
          });

          rawAssetsByChain[account].chains?.forEach((chainData) => {
            chainData.collections.forEach((collection) => {
              collection.assets.forEach((asset) => assetsIds.add(asset.id));
            });
          });
        }
      });
    });

    return mapToObject(assetsByAccounts);
  }
}
