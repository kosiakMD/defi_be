import { createHash } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ChainIdEnum } from '@app/common';

@Injectable()
export class CosmosHelper {
  readonly chainUrlMap: Map<number, string>;

  constructor(private readonly configService: ConfigService) {
    this.chainUrlMap = new Map<number, string>([
      [
        ChainIdEnum.cosmos,
        `${this.configService.get(
          'COSMOS_LCD',
        )}/ibc/apps/transfer/v1/denom_traces?pagination.limit=1000`,
      ],
      [
        ChainIdEnum.kava,
        `${this.configService.get(
          'KAVA_LCD',
        )}/ibc/apps/transfer/v1/denom_traces?pagination.limit=1000`,
      ],
      [
        ChainIdEnum.osmosis,
        `${this.configService.get(
          'OSMOSIS_LCD',
        )}/ibc/apps/transfer/v1/denom_traces?pagination.limit=1000`,
      ],
      [
        ChainIdEnum.secret,
        `${this.configService.get(
          'SECRET_LCD',
        )}/ibc/apps/transfer/v1/denom_traces?pagination.limit=1000`,
      ],
    ]);
  }

  transformDenomToHash({
    path,
    base_denom: baseDenom,
  }: {
    path: string;
    base_denom: string;
  }): string {
    const msgBuffer = new TextEncoder().encode(path + '/' + baseDenom);
    const hashBuffer = createHash('sha256') //
      .update(msgBuffer)
      .digest();
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return 'ibc/' + hashHex.toUpperCase();
  }
}
