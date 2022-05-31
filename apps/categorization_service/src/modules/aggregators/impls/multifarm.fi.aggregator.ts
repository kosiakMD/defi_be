import { doWhilst, series } from 'async';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Puppeteer } from '../../../utils';
import { Protocol } from '../../database/entities/protocol.entity';
import { ChainsRepository } from '../../database/repositories/chains.repo';
import { ProtocolChainRepository } from '../../database/repositories/protocol.chain.repo';
import { ProtocolsPropertiesRepository } from '../../database/repositories/protocols.properties.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { TasksAbortChecker } from '../../services/tasks.abort.checker';
import { IAggregator } from '../aggregator.interface';

type FarmInfo = {
  farmId: string;
  farmName: string;
  blockchain: string;
  tvlStaked: string;
};

type protocolsTvlMap = Map<
  string,
  {
    tvlStaked: string;
    protocol: Protocol;
  }
>;

@Injectable()
export class MultifarmFiAggregator implements IAggregator {
  readonly apiUrl = 'https://api.multifarm.fi/jay_flamingo_random_6ix_vegas/get_farms';
  readonly siteUrl = 'https://app.multifarm.fi';
  readonly name = 'multifarm.fi';
  readonly tvlMin = 1000000000;
  readonly testRun: boolean;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
    @InjectRepository(ChainsRepository) private readonly chainsRepo: ChainsRepository,
    @InjectRepository(ProtocolChainRepository)
    private readonly protocolChainRepo: ProtocolChainRepository,
    @InjectRepository(ProtocolsPropertiesRepository)
    private readonly protocolsPropertiesRepo: ProtocolsPropertiesRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly tasksAbortChecker: TasksAbortChecker,
  ) {
    this.testRun = JSON.parse(configService.get('TEST_RUN'));
  }

  async run() {
    let page = 1;
    await doWhilst(
      async () => this.getFarms(page),
      async (farms: FarmInfo[]) => {
        const toProceed = await this.processFarms(farms);
        page++;
        return !this.testRun && toProceed;
      },
    );
  }

  private async processFarms(farms: FarmInfo[]): Promise<boolean> {
    const protocolsTvlMap: protocolsTvlMap = new Map();

    await series(
      farms.map((farm) => async () => {
        const { farmId, farmName, blockchain, tvlStaked } = farm;
        const url = await this.extractWebsiteUrl(`${this.siteUrl}/farms/${farmId}`);
        const chains = await this.chainsRepo.upsertChains([blockchain]);
        const [protocol] = await this.protocolsRepo.upsertProtocols([
          {
            name: farmName,
            url,
          },
        ]);
        await this.protocolChainRepo.upsertProtocolChains(protocol, chains);

        const check = protocolsTvlMap.get(farmName);
        if (check) {
          protocolsTvlMap.get(farmName).tvlStaked += tvlStaked;
        } else {
          protocolsTvlMap.set(farmName, {
            tvlStaked,
            protocol,
          });
        }
        this.tasksAbortChecker.ensureTaskNotAborted();
      }),
    );

    await this.saveProtocolTVL(protocolsTvlMap);

    return !!farms.length;
  }

  private async saveProtocolTVL(protocolsTvlMap: protocolsTvlMap): Promise<void> {
    await Promise.all(
      Array.from(protocolsTvlMap.values()).map(async ({ tvlStaked, protocol }) => {
        await this.protocolsPropertiesRepo.upsertProtocolProperties(
          [
            {
              name: 'TVL',
              value: tvlStaked,
            },
          ],
          this.name,
          protocol,
        );
      }),
    );
  }

  private async getFarms(page = 1): Promise<FarmInfo[]> {
    const url = this.getApiUrl(page);
    const list$ = await this.httpService.get(url);
    const list = await firstValueFrom(list$);
    return list.data.data.map(({ farmId, farmName, blockchain, tvlStaked }) => ({
      farmId,
      farmName,
      blockchain,
      tvlStaked,
    }));
  }

  private getApiUrl(page = 1): string {
    return `${this.apiUrl}?pg=${page}&sort=tvlStaked&sort_order=desc&tvl_min=${this.tvlMin}`;
  }

  private async extractWebsiteUrl(pageUrl: string): Promise<string> {
    const page = await this.browser.loadPage(pageUrl);
    const websiteUrl = await page.evaluate(() => {
      const link = document.querySelector('p > span > a');
      return link?.getAttribute('href') || 'N/a';
    });
    this.logger.debug(`extracted website url from [${pageUrl}] - [${websiteUrl}]`);
    await page.close();
    return websiteUrl;
  }
}
