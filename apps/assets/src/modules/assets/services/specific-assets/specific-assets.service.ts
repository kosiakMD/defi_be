import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { AssetReference } from '../../../../common/types';

import { AssetDto } from '../../dto/asset.dto';
import {
  AssetAnalyser,
  AssetAnalysis,
  UNKNOWN_ASSET,
} from './analysers/common/base.asset-analyser';
import { AssetPriceProvider, ComplexAsset } from './analysers/common/price.provider';
import { SaberAssetAnalyser } from './analysers/saber.asset-analyser';
import { UniswapV2AssetAnalyser } from './analysers/uniswapv2.asset-analyser';

@Injectable()
export class SpecificAssetsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly moduleRef: ModuleRef,
  ) {}

  private assetAnalysers = [UniswapV2AssetAnalyser, SaberAssetAnalyser];

  async analyseAsset(asset: AssetReference): Promise<AssetAnalysis> {
    const analysis = await Promise.all(
      this.assetAnalysers
        .map((analyser) => this.moduleRef.get(analyser))
        .map((analyser) => this.analyseAssetByAnalyser(analyser, asset)),
    );

    // TODO: Check that only one analysis could provide underlying tokens
    return analysis.reduce(mergeAssetAnalysis);
  }

  private async analyseAssetByAnalyser(analyser: AssetAnalyser, asset: AssetReference) {
    try {
      if (!(await analyser.canCheckAsset(asset))) {
        return UNKNOWN_ASSET;
      }

      return await analyser.checkAsset(asset);
    } catch (e) {
      this.logger.error(
        `Error analysing asset: ${asset.address} chain: ${asset.chainId}. Error: ${e}`,
      );
      return UNKNOWN_ASSET;
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

    // TODO: Fix this, not everything is price provider
    const priceProviders: AssetPriceProvider[] = this.assetAnalysers.map((analyser) =>
      this.moduleRef.get(analyser),
    );

    for (const chainId of assetsChainMap.keys()) {
      const chainAssets = assetsChainMap.get(chainId);
      for (const priceProvider of priceProviders) {
        // TODO: Refactor this one
        const priceProviderAssets = chainAssets.filter((dto) =>
          dto.categories
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
}

// TODO: Move to class instead of interface
function mergeAssetAnalysis(one: AssetAnalysis, two: AssetAnalysis): AssetAnalysis {
  if (!one || !one.done) {
    return { ...two };
  }

  if (!two || !two.done) {
    return { ...one };
  }

  return {
    done: true,
    metadata: { ...one.metadata, ...two.metadata },
    underlying: [...one.underlying, ...two.underlying],
    categories: [...one.categories, ...two.categories],
  };
}
