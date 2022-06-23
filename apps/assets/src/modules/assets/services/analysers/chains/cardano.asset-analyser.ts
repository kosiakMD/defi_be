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
    if (!asset) {
      return null;
    }

    if (asset.metadata && asset.metadata.ticker && asset.metadata.decimals) {
      const { metadata } = asset;
      return {
        symbol: metadata.ticker,
        name: metadata.name,
        decimals: metadata.decimals,
      };
    }

    if (asset.asset_name && asset.onchain_metadata && asset.onchain_metadata.name) {
      return {
        symbol: Buffer.from(asset.asset_name, 'hex').toString('utf8'),
        name: asset.onchain_metadata.name,
        decimals: 0,
      };
    }

    return null;
  }
}
