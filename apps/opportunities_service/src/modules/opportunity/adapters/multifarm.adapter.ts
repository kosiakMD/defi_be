import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IOpportunityAdapter } from '../interfaces/opportunity.adapter.interface';
import { AdapterOptions, AdapterResults } from '../types/opportunity.adapter.types';

@Injectable()
export class LegacyAdapter implements IOpportunityAdapter {
  endpoint: string;
  apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = config.get('multifarm.endpoint');
    this.apiKey = config.get('multfarm.apiKey');
  }

  async loadData(options: AdapterOptions): Promise<AdapterResults> {
    // TODO: Coming Soon...
    JSON.stringify(options);
    return;
  }
}
