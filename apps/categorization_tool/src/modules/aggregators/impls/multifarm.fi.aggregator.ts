import { doWhilst, series } from 'async';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Puppeteer } from '../../../utils';
import { ChainsRepository } from '../../database/repositories/chains.repo';
import { ProtocolChainRepository } from '../../database/repositories/protocol.chain.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { IAggregator } from '../aggregator.interface';

type FarmInfo = {
  farmId: string;
  farmName: string;
  blockchain: string;
};

@Injectable()
export class MultifarmFiAggregator implements IAggregator {
  readonly apiUrl = 'https://api.multifarm.fi/jay_flamingo_random_6ix_vegas/get_farms';
  readonly siteUrl = 'https://app.multifarm.fi';
  readonly name = 'multifarm.fi';
  readonly tvlMin = 1000000000;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
    @InjectRepository(ChainsRepository) private readonly chainsRepo: ChainsRepository,
    @InjectRepository(ProtocolChainRepository)
    private readonly protocolChainRepo: ProtocolChainRepository,
    private readonly httpService: HttpService,
  ) {}

  async run() {
    let page = 1;
    await doWhilst(
      async () => this.getFarms(page),
      async (farms: FarmInfo[]) => {
        const toProceed = await this.processFarms(farms);
        page++;
        return toProceed;
      },
    );
  }

  private async processFarms(farms: FarmInfo[]): Promise<boolean> {
    await series(
      farms.map((farm) => async () => {
        const { farmId, farmName, blockchain } = farm;
        const url = await this.extractWebsiteUrl(`${this.siteUrl}/farms/${farmId}`);
        const chains = await this.chainsRepo.upsertChains([blockchain]);
        const [protocol] = await this.protocolsRepo.upsertProtocols([
          {
            name: farmName,
            url,
          },
        ]);
        await this.protocolChainRepo.upsertProtocolChains(protocol, chains);
      }),
    );
    return !!farms.length;
  }

  private async getFarms(page = 1): Promise<FarmInfo[]> {
    const url = this.getApiUrl(page);
    const list$ = await this.httpService.get(url);
    const list = await firstValueFrom(list$);
    return list.data.data.map(({ farmId, farmName, blockchain }) => ({
      farmId,
      farmName,
      blockchain,
    }));
  }

  private getApiUrl(page = 1): string {
    return `${this.apiUrl}?pg=${page}&sort=tvlStaked&sort_order=desc&tvl_min=${this.tvlMin}`;
  }

  private async extractWebsiteUrl(pageUrl: string): Promise<string> {
    const page = await this.browser.loadPage(pageUrl);
    const websiteUrl = await page.evaluate(() => {
      const link = document.querySelector('p > span > a');
      return link?.getAttribute('href') || 'N/A';
    });
    this.logger.debug(`extracted website url from [${pageUrl}] - [${websiteUrl}]`);
    await page.close();
    return websiteUrl;
  }
}
