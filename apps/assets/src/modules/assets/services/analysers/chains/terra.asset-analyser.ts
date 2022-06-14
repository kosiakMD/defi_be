import { LCDClient } from '@terra-money/terra.js';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AbsoluteChainIdEnum, ChainIdEnum } from '@app/common';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalyser, AssetAnalysisResult } from '../core/asset.analyser';

@Injectable()
export class TerraAssetAnalyser implements AssetAnalyser {
  private readonly client: LCDClient;
  constructor(config: ConfigService) {
    // TODO: Is that terra native API?
    this.client = new LCDClient({
      URL: config.get<string>('TERRA_URL'),
      chainID: AbsoluteChainIdEnum.terra.toString(),
    });
  }

  canAnalyseAsset({ chainId }: AssetReference): boolean {
    return chainId === ChainIdEnum.terra;
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    // TODO: Add typings
    // TODO: What if token is not returned
    // eslint-disable-next-line camelcase
    return this.client.wasm.contractQuery(address, { token_info: {} });
  }
}
