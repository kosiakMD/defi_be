import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalysisResult } from '../core/asset.analyser';
import { CardanoBaseAssetAnalyser } from '../core/cardano-base.asset-analyser';

@Injectable()
// TODO: Rename this?
export class CardanoAssetAnalyser extends CardanoBaseAssetAnalyser {
  private readonly api: BlockFrostAPI;
  constructor(config: ConfigService) {
    super();
    this.api = new BlockFrostAPI({
      projectId: config.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    });
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    const asset = await this.api.assetsById(address.replace('.', ''));
    if (!asset?.metadata || !asset?.metadata.ticker || !asset?.metadata.decimals) {
      return null;
    }

    const { metadata } = asset;
    return {
      symbol: metadata.ticker,
      name: metadata.name,
      decimals: metadata.decimals,
    };
  }
}
