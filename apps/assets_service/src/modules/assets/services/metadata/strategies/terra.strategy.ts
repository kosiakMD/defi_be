import { LCDClient } from '@terra-money/terra.js';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AbsoluteChainIdEnum } from '@app/common';

import { AssetMetadata, MetadataStrategy } from './metadata.strategy';

@Injectable()
export class TerraMetadataStrategy implements MetadataStrategy {
  private readonly client: LCDClient;
  constructor(config: ConfigService) {
    // TODO: Is that terra native API?
    this.client = new LCDClient({
      URL: config.get<string>('TERRA_URL'),
      chainID: AbsoluteChainIdEnum.terra.toString(),
    });
  }

  getMetadata(address: string): Promise<AssetMetadata> {
    // TODO: Add typings
    // TODO: What if token is not returned
    // eslint-disable-next-line camelcase
    return this.client.wasm.contractQuery(address, { token_info: {} });
  }
}
