import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '@app/common';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

@Injectable()
export class CardanoAssetAnalyser implements AssetAnalyser {
  private readonly api: BlockFrostAPI;
  constructor(config: ConfigService) {
    this.api = new BlockFrostAPI({
      projectId: config.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    });
  }

  canAnalyseAsset({ chainId }: AssetReference): boolean {
    return chainId === ChainIdEnum.cardano;
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    const asset = await this.api.assetsById(address);
    if (!asset?.metadata) {
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
