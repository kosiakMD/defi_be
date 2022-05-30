import { PriceService } from 'apps/account_service/src/common/providers/microservices/price/price.service';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import web3 from 'web3';

import { CACHE_MANAGER, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Address, ChainAbbrEnum, ChainNameEnum, NftProjectEnum } from '@app/common';
import { GHST_ADDRESS_POLYGON, ZERO_ADDRESS } from '@app/common/constant';
import { ChainIdToAbbr, ChainIdToName } from '@app/common/constant/dictionaries';
import {
  aavegotchiCollectionEthereum,
  aavegotchiCollectionPolygon,
  aavegotchiTraits,
} from '@app/common/constant/nft';
import {
  ChainCollectionsDto as NftChainDto,
  ChainsDto as NftChainsDto,
  CollectionChainsDto,
  CollectionDto,
  NftAssetDto,
} from '@app/common/dto/nft';
import {
  NftAssetsByAccounts,
  NftCollectionsByAccounts,
} from '@app/common/interfaces/nft.interface';
import { mapToObject, sumOfProperties } from '@app/common/utils/object';
import { getKey } from '@app/common/utils/string';

import { ChainsService } from '../chains/chains.service';
import { GotchiOwned, Id, Svg, User } from './interfaces/aavegotchi.interface';
import { NftBasicService } from './nft.basic.service';
import { OpenSeaService } from './open.sea.service';
import { AavegotchiSubgraph } from './subgraphes/aavegotchi/aavegotchi.subgraph';
import { AssetsService } from '../assets/assets.service';

export class AavegotchiService extends NftBasicService implements OnModuleInit {
  public readonly project = NftProjectEnum.aavegotchi;
  public readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.plg];
  public chainsIds: number[] = [];
  private polygonChain;
  private ethChain;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly configService: ConfigService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: AavegotchiSubgraph,
    protected readonly openSeaService: OpenSeaService,
    private readonly chainsService: ChainsService,
    private readonly assetsService: AssetsService,
  ) {
    super();
    BigNumber.config({ EXPONENTIAL_AT: 30 });
  }

  async onModuleInit() {
    this.ethChain = await this.chainsService.get({ name: ChainNameEnum.eth });
    this.polygonChain = await this.chainsService.get({ name: ChainNameEnum.plg });
    this.chainsIds.push(this.ethChain.id, this.polygonChain.id);
  }

  private static getSvgKey(...ids: string[]): string {
    return getKey('nft', 'asset', 'svg', ...ids);
  }

  private static getCollectionsKey(accounts: Address[]): string {
    return getKey('nft', 'collections', 'by', 'account', ...accounts);
  }

  private getPolygonChainInfo(fillCollections = true): CollectionChainsDto {
    return {
      chains: [
        {
          chain: {
            id: this.polygonChain.id,
            abbr: this.polygonChain.abbr,
            name: this.polygonChain.name,
          },
          collections: fillCollections
            ? [
                {
                  ...aavegotchiCollectionPolygon,
                  chain: this.polygonChain.id,
                  project: this.project,
                },
              ]
            : [],
        },
      ],
    };
  }

  private mapPortalsGotchisIdsByAccounts(
    rawPortalsGotchisIdsByAccounts: User<Id, Id>[],
  ): Map<Address, Omit<User<Id, Id>, 'id'>> {
    const mapped = new Map<Address, Omit<User<Id, Id>, 'id'>>();

    rawPortalsGotchisIdsByAccounts.forEach((rawPortalsGotchisIdsByAccount) =>
      mapped.set(rawPortalsGotchisIdsByAccount.id, {
        gotchisOwned: rawPortalsGotchisIdsByAccount.gotchisOwned,
        portalsOwned: rawPortalsGotchisIdsByAccount.portalsOwned,
      }),
    );

    return mapped;
  }

  private async getPolygonCollection(accounts: Address[]): Promise<NftCollectionsByAccounts> {
    const cachedCollectionsByAccounts = await this.cache.get<NftCollectionsByAccounts>(
      AavegotchiService.getCollectionsKey(accounts),
    );

    if (cachedCollectionsByAccounts) {
      return cachedCollectionsByAccounts;
    }

    const collectionsByAccounts = new Map<Address, CollectionChainsDto>();

    const portalsGotchisIdsByAccounts = this.mapPortalsGotchisIdsByAccounts(
      await this.subgraph.getPortalsGotchisIds(accounts),
    );

    accounts.forEach((account) => {
      const portalsGotchisIdsByAccount = portalsGotchisIdsByAccounts.get(account);

      collectionsByAccounts.set(account, this.getPolygonChainInfo(!!portalsGotchisIdsByAccount));
    });

    return mapToObject(collectionsByAccounts);
  }

  private async handleEthereumCollections(
    accounts: Address[],
    chain: number,
  ): Promise<NftCollectionsByAccounts> {
    return await this.openSeaService.getCollectionsByAccounts(
      accounts,
      [chain],
      aavegotchiCollectionEthereum.slug,
    );
  }

  public async getCollectionsByAccounts(
    accounts: string[],
    chains: number[],
  ): Promise<NftCollectionsByAccounts> {
    const collectionsByAccounts = new Map<Address, CollectionChainsDto>();

    const rawCollectionsByAccounts = await Promise.all(
      chains.map(async (chain) => {
        switch (chain) {
          case this.ethChain.id:
            return await this.handleEthereumCollections(accounts, chain);

          case this.polygonChain.id:
            return this.getPolygonCollection(accounts);
        }
      }),
    );

    accounts.forEach((account) => {
      collectionsByAccounts.set(account, { chains: [] });

      rawCollectionsByAccounts.map((rawCollectionsByAccount) => {
        if (rawCollectionsByAccount[account]) {
          const prevCollectionsByAccount = collectionsByAccounts.get(account);
          const chains = [
            ...(prevCollectionsByAccount?.chains || []),
            ...rawCollectionsByAccount[account].chains,
          ];

          collectionsByAccounts.set(account, { chains });
        }
      });
    });

    return mapToObject(collectionsByAccounts);
  }

  private async handleEthereum(accounts: Address[], chain: number): Promise<NftAssetsByAccounts[]> {
    return [
      await this.openSeaService.getAssetsByAccounts(accounts, aavegotchiCollectionEthereum.slug, [
        chain,
      ]),
    ];
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

  private mapPolygonCollection(assets: NftAssetDto[]): CollectionDto {
    const { totalCollectionPrice, totalCollectionPriceUsd } = sumOfProperties(
      assets,
      ['price', 'priceUsd'],
      ['totalCollectionPrice', 'totalCollectionPriceUsd'],
    );

    return plainToClass(CollectionDto, {
      address: aavegotchiCollectionPolygon.address,
      chain: this.polygonChain.id,
      usernames: aavegotchiCollectionPolygon.usernames,
      assets,
      name: aavegotchiCollectionPolygon.name,
      symbol: aavegotchiCollectionPolygon.symbol,
      description: aavegotchiCollectionPolygon.description,
      totalCollectionPrice: totalCollectionPrice || null,
      totalCollectionPriceUsd: totalCollectionPriceUsd || null,
      balance: assets.length,
      links: aavegotchiCollectionPolygon.links,
      project: this.project,
    });
  }

  private async handlePolygon(accounts: Address[], chain: number): Promise<NftAssetsByAccounts[]> {
    const imagesByAssets = new Map<string, string>();

    const rawAssets = await this.subgraph.getUsers(accounts);

    // TODO: Check if ZERO_ADDRESS is supported by assets service
    const { prices } = await this.assetsService.getPricesForAssets(
      [GHST_ADDRESS_POLYGON, ZERO_ADDRESS],
      chain,
    );

    return await Promise.all(
      rawAssets.map(async ({ id: account, gotchisOwned }) => {
        const gotchisIds = gotchisOwned.map(({ id }) => id);

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

        const collection = this.mapPolygonCollection(assets);

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
                totalChainPrice: collection?.totalCollectionPrice || null,
                totalChainPriceUsd: collection?.totalCollectionPriceUsd || null,
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
    collection: string,
    chains: number[],
  ): Promise<NftAssetsByAccounts> {
    const assetsByAccounts = new Map<Address, NftChainsDto>();
    const assetsIds = new Set<string>();

    const rawAssetsByAccounts = await Promise.all(
      chains.map(async (chain) => {
        switch (chain) {
          case this.ethChain.id:
            return await this.handleEthereum(accounts, chain);
          case this.polygonChain.id:
            return await this.handlePolygon(accounts, chain);
          default:
            return [];
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
