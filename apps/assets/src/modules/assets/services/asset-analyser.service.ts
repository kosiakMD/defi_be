import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { AssetReference } from '../../../common/types';

import { AssetDto } from '../dto/asset.dto';
import { AssetAnalyser, AssetAnalysisResult } from './analysers/core/asset.analyser';
import { AssetPriceProvider, ComplexAsset } from './analysers/core/price.provider';
import { assetAnalysers } from './analysers/registry';

@Injectable()
export class AssetAnalyserService {
  private analysers: AssetAnalyser[] = [];
  private priceProviders: AssetPriceProvider[] = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly moduleRef: ModuleRef,
  ) {}

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysisResult> {
    // TODO: Does not look very good, think on better one
    await this.ensureAnalysersSetup();

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

      return await analyser.analyseAsset(asset);
    } catch (e) {
      this.logger.error(
        `Error analysing asset: ${asset.address} chain: ${asset.chainId}. Error: ${e}`,
      );
    }
  }

  // TODO: Update this one, should return prices not work with DTO and refactor this
  async updateSpecificAssetsPrices(assets: AssetDto[]): Promise<AssetDto[]> {
    // TODO: Does not look very good, think on better one
    await this.ensureAnalysersSetup();

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
        // TODO: Refactor this one
        const priceProviderAssets = chainAssets.filter((dto) =>
          (dto.categories || [])
            .map(({ code }) => code)
            .some((code) => priceProvider.canHandleCategory(code)),
        );

        if (priceProviderAssets.length) {
          await this.updateSpecificAssetsPricesForChain(
            chainId,
            priceProviderAssets,
            priceProvider,
          );
        }
      }
    }

    return assets;
  }

  private async updateSpecificAssetsPricesForChain(
    chainId: number,
    dtos: AssetDto[],
    provider: AssetPriceProvider,
  ) {
    const assets = dtos.map<ComplexAsset>((dto) => ({
      address: dto.address,
      decimals: dto.decimals,
      underlying: dto.underlying?.map(({ underlyingAsset }) => ({
        address: underlyingAsset.address,
        decimals: underlyingAsset.decimals,
        price: underlyingAsset.price,
      })),
    }));

    const prices = await provider.getPrices(chainId, assets);

    for (const dto of dtos) {
      const price = prices.find(({ asset }) => asset.address === dto.address);
      dto.price = price?.price;
    }
  }

  private async ensureAnalysersSetup() {
    this.analysers = await Promise.all(
      assetAnalysers.map((analyser) => this.moduleRef.resolve(analyser)),
    );
    // TODO: Fix that injection, price provider could be separate
    this.priceProviders = this.analysers.filter(
      (analyser) => analyser['getPrices'] !== undefined,
    ) as any;
  }
}

// TODO: Move to class instead of interface
function mergeAssetAnalysis(
  one: AssetAnalysisResult,
  two: AssetAnalysisResult,
): AssetAnalysisResult {
  if (!one) {
    return { ...two };
  }

  if (!two) {
    return { ...one };
  }

  return {
    // TODO: Refactor this one
    name: one.name || two.metadata,
    symbol: one.symbol || two.symbol,
    decimals: one.decimals !== undefined && one.decimals !== null ? one.decimals : two.decimals,
    // TODO: This one is wrong we should sum them up
    rank: one.rank || two.rank,
    isTracked: one.isTracked || two.isTracked,
    metadata: { ...one.metadata, ...two.metadata },
    underlying: mergeArrays(one.underlying, two.underlying),
    categories: mergeArrays(one.categories, two.categories),
    icons: mergeArrays(one.icons, two.icons),
  };
}

function mergeArrays<T = any>(one: T[], two: T[]): T[] {
  return [...(one || []), ...(two || [])];
}
