import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AssetMetadata, MetadataStrategy } from './metadata.strategy';

@Injectable()
export class CardanoMetadataStrategy implements MetadataStrategy {
  private readonly api: BlockFrostAPI;
  constructor(config: ConfigService) {
    this.api = new BlockFrostAPI({
      projectId: config.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    });
  }

  async getMetadata(address: string): Promise<AssetMetadata> {
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
