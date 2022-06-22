import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainId, Logger } from '@app/common';
import { formatError } from '@app/common/utils';

import { AssetReference } from '../../../common/types';

import { AssetDto } from '../dto/asset.dto';
import { AssetAnalyser, AssetAnalysisResult } from './analysers/core/asset.analyser';
import { AssetPriceProvider, ComplexAsset } from './analysers/core/price.provider';
import { assetAnalysers } from './analysers/registry';

@Injectable()
export class AssetAnalyserService implements OnModuleInit {
  private analysers: AssetAnalyser[] = [];
  private priceProviders: AssetPriceProvider[] = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    await this.ensureAnalysersSetup();
  }

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysisResult> {
    const analysis = await Promise.all(
      this.analysers.map((analyser) => this.analyseAssetByAnalyser(analyser, asset)),
    );

    // TODO: Check that only one analysis could provide underlying tokens
    return analysis.reduce(mergeAssetAnalysis);
  }

  private async analyseAssetByAnalyser(analyser: AssetAnalyser, asset: AssetReference) {
    try {
      if (!(await analyser.canAnalyseAsset(asset))) {
        return;
      }

      const analysis = await analyser.analyseAsset(asset);
      if (analysis) {
        this.logger.debug(
          `Asset analyser ${analyser.constructor.name} results: ${JSON.stringify(analysis)}`,
        );
      } else {
        this.logger.debug(
          `Asset analyser ${analyser.constructor.name} does not recognize ${JSON.stringify(asset)}`,
        );
      }

      return analysis;
    } catch (e) {
      this.logger.error(`Error analysing asset by ${analyser.constructor.name}`, {
        asset,
        // TODO: This should be supported by logger
        error: formatError(e),
      });
    }
  }

  // TODO: Update this one, should return prices not work with DTO and refactor this
  async updateSpecificAssetsPrices(assets: AssetDto[]): Promise<AssetDto[]> {
    const assetsWithoutPrices = assets.filter((asset) => !asset.price);
    if (!assetsWithoutPrices) {
      return assets;
    }

    const assetsChainMap = assetsWithoutPrices.reduce((map, asset) => {
      const chainAssets = map.get(asset.chainId) || [];
      map.set(asset.chainId, chainAssets.concat([asset]));
      return map;
    }, new Map<number, AssetDto[]>());

    for (const chainId of assetsChainMap.keys()) {
      const chainAssets = assetsChainMap.get(chainId);
      for (const priceProvider of this.priceProviders) {
        const priceProviderAssets = chainAssets.filter((dto) =>
          priceProvider.canHandleCategories(dto.categories.map((x) => x.code)),
        );

        if (priceProviderAssets.length) {
          await this.updateSpecificAssetsPricesForChain(
            chainId,
            priceProviderAssets,
            priceProvider,
            assets,
          );
        }
      }
    }

    return assets;
  }

  private async updateSpecificAssetsPricesForChain(
    chainId: ChainId,
    dtos: AssetDto[],
    provider: AssetPriceProvider,
    allAssets: AssetDto[],
  ) {
    const assets = dtos.map<ComplexAsset>((dto) => ({
      address: dto.address,
      decimals: dto.decimals,
      underlying: dto.underlying?.map(({ address }) => {
        const underlyingAsset = allAssets.find((dto) => dto.address === address);
        return {
          address: underlyingAsset.address,
          decimals: underlyingAsset.decimals,
          price: underlyingAsset.price,
        };
      }),
    }));

    const prices = await provider.getPrices(chainId, assets);

    for (const dto of dtos) {
      const price = prices.find(({ asset }) => asset.address === dto.address);
      dto.price = price?.price;
      if (dto.underlying?.length) {
        dto.underlying.forEach((underlying, index) => {
          if (price?.reserves) {
            underlying.reserve = price?.reserves[index];
          }
        });
      }
    }
  }

  private async ensureAnalysersSetup() {
    const instansiatedAnalyzers = await Promise.all(
      assetAnalysers.map((analyser) => this.moduleRef.resolve(analyser)),
    );

    this.analysers = instansiatedAnalyzers.filter(
      (analyser) => analyser['canAnalyseAsset'] !== undefined,
    ) as any;

    this.priceProviders = instansiatedAnalyzers.filter(
      (analyser) => analyser['getPrices'] !== undefined,
    ) as any;
  }
}

// TODO: Move to class instead of interface
function mergeAssetAnalysis(
  one: AssetAnalysisResult,
  two: AssetAnalysisResult,
): AssetAnalysisResult {
  if (!one && !two) {
    return;
  }

  if (!one) {
    return { ...two };
  }

  if (!two) {
    return { ...one };
  }

  return {
    // TODO: Refactor this one
    name: getNotEmpty(one.name, two.name),
    symbol: getNotEmpty(one.symbol, two.symbol),
    displayName: getNotEmpty(one.displayName, two.displayName),
    decimals: getNotEmpty(one.decimals, two.decimals),
    // TODO: This one is wrong we should sum them up
    isTracked: one.isTracked || two.isTracked,
    metadata: { ...one.metadata, ...two.metadata },
    underlying: getNotEmptyArray(one.underlying, two.underlying),
    categories: [...new Set(mergeArrays(one.categories, two.categories))],
    icons: mergeArrays(one.icons, two.icons),
  };
}

function getNotEmpty<T = any>(one: T, two: T): T {
  return one !== undefined && one !== null ? one : two;
}

function getNotEmptyArray<T = any>(one: T[], two: T[]): T[] {
  return one?.length > 0 ? one : two;
}

function mergeArrays<T = any>(one: T[], two: T[]): T[] {
  return [...(one || []), ...(two || [])];
}
