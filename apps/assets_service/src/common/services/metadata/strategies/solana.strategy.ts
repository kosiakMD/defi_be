import { HttpService } from '@nestjs/axios';

import { MetadataStrategy } from './index';

export class SolanaMetadataStrategy extends MetadataStrategy {
  constructor(private http: HttpService) {
    super();
  }
  async getMetadata(address): Promise<any> {
    const { data: asset } = await this.http
      .get('https://public-api.solanabeach.io/v1/account/' + address)
      .toPromise();

    return {
      name: asset.value.base.address.name,
      symbol: asset.value.base.address.ticker,
      decimals: asset.value.extended.decimals,
    };
  }
}
