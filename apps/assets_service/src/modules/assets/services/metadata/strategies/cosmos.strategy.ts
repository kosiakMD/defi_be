/* eslint-disable camelcase */
import { lastValueFrom, map } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AssetMetadata, MetadataStrategy } from './metadata.strategy';

// TODO: Looks like not all cosmos chains are handled
// TODO: Review this implementation and use native APIs or on-chain data
@Injectable()
export class CosmosMetadataStrategy implements MetadataStrategy {
  constructor(private readonly http: HttpService) {}

  async getMetadata(address: string): Promise<AssetMetadata> {
    const [metadata] = handlePromiseAllSettled(
      await Promise.allSettled([
        this.getKavaMetadata(address),
        this.getOsmosisMetadata(address),
        this.getOsmosis1Metadata(address),
        this.getMintMetadata(address),
      ]),
    );

    return metadata.find((val) => !!val && val.decimals && val.name && val.symbol);
  }

  osmosisUrl = 'https://api-osmosis.imperator.co/tokens/v2/all';
  osmosis1Url = 'https://api-utility.cosmostation.io/v1//ibc/tokens/osmosis-1';
  mintScanUrl = 'https://api.mintscan.io/v1/assets';
  kavaUrl = 'https://api-utility.cosmostation.io/v1/ibc/tokens/kava-9';

  private async getMintMetadata(address: string): Promise<AssetMetadata> {
    const tokens = await lastValueFrom(
      this.http.get(this.mintScanUrl).pipe(map(({ data }) => data.assets)),
    );

    const tkn = tokens.find((t) => t.denom === address || t.origin_denom === address);
    if (tkn) {
      return {
        symbol: tkn.origin_symbol,
        name: tkn.origin_denom,
        decimals: tkn.decimal,
      };
    }
  }

  private async getKavaMetadata(address: string): Promise<AssetMetadata> {
    const tokens = await lastValueFrom(
      this.http.get(this.kavaUrl).pipe(map(({ data }) => data.ibc_tokens)),
    );

    const tkn = tokens.find((t) => t.base_denom === address || t.display_denom === address);
    if (tkn) {
      return {
        symbol: tkn.display_denom,
        name: tkn.display_denom,
        decimals: tkn.decimal,
      };
    }
  }

  private async getOsmosis1Metadata(address: string): Promise<AssetMetadata> {
    const tokens = await lastValueFrom(
      this.http.get(this.osmosis1Url).pipe(map(({ data }) => data.ibc_tokens)),
    );

    const tkn = tokens.find((t) => t.base_denom === address || t.display_denom === address);
    if (tkn) {
      return {
        symbol: tkn.display_denom,
        name: tkn.base_denom,
        decimals: tkn.decimal,
      };
    }
  }

  private async getOsmosisMetadata(address: string): Promise<AssetMetadata> {
    const tokens = await lastValueFrom(
      this.http.get(this.osmosisUrl).pipe(map(({ data }) => data)),
    );
    const tkn = tokens.find((t) => t.denom === address || t.name === address);

    if (tkn) {
      return {
        symbol: tkn.symbol,
        name: tkn.name,
        decimals: tkn.exponent,
      };
    }
  }
}
