import { firstValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { AssetReference } from '../../../../../common/types';

import { AssetAnalysisResult } from '../core/asset.analyser';
import { CardanoBaseAssetAnalyser } from '../core/cardano-base.asset-analyser';

@Injectable()
export class CardanoKoiosAssetAnalyser extends CardanoBaseAssetAnalyser {
  private readonly KOIOS_ENDPOINT = 'https://api.koios.rest/api/v0/asset_info';
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async analyseAsset({ address }: AssetReference): Promise<AssetAnalysisResult> {
    const [policyID, assetName] = address.split('.');
    const $request = this.httpService
      .get(this.KOIOS_ENDPOINT, {
        params: {
          ['_asset_policy']: policyID,
          ['_asset_name']: assetName,
        },
      })
      .pipe(map(({ data }) => data[0]?.token_registry_metadata));
    const asset = await firstValueFrom($request);

    if (!asset?.name || !asset?.ticker || isNaN(asset?.decimals)) {
      return null;
    }

    return {
      symbol: asset.ticker,
      name: asset.name,
      decimals: asset.decimals,
    };
  }
}
