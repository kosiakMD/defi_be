import { HttpService } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CosmosHubBalancesStrategy } from './cosmos-hub.balances.strategy';

@Injectable()
export class OsmosisBalancesStrategy extends CosmosHubBalancesStrategy {
  protected endpoint: string;

  constructor(
    private readonly configService: ConfigService,
    protected readonly httpService: HttpService,
  ) {
    super();

    this.endpoint = this.configService.get<string>('OSMOSIS_LCD');
  }
}
