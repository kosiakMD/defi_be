import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { AssetMetadata, MetadataStrategy } from './metadata.strategy';

// TODO: Review this strategy and use chain not API
@Injectable()
export class SolanaMetadataStrategy implements MetadataStrategy {
  constructor(private readonly http: HttpService) {}

  async getMetadata(address: string): Promise<AssetMetadata> {
    const { data: asset } = await firstValueFrom(
      this.http.get(`https://public-api.solanabeach.io/v1/account/${address}`),
    );

    // TODO: Add typings
    if (!asset?.value) {
      return null;
    }

    const { base, extended } = asset.value;
    return {
      name: base.address.name,
      symbol: base.address.ticker,
      decimals: extended.decimals,
    };
  }
}
