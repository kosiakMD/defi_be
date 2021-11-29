import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';
import { Logger } from '@app/common/Logger/Logger.service';

import { PriceService } from '../microservices/price.service';
import { IProtocolPriceUpdate } from './interfaces/protocol.price.update';
import { JobsRegistry } from './jobs.registry';

@Injectable()
export class JobsRunner {
  private jobsToRun: Map<string, IProtocolPriceUpdate> = new Map<string, IProtocolPriceUpdate>();
  chain: ChainIdEnum;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly jobsRegistry: JobsRegistry,
    private readonly priceService: PriceService,
    private readonly configService: ConfigService,
  ) {
    this.chain = Number(this.configService.get('CHAIN_ID'));
  }

  private get jobs() {
    return [...this.jobsToRun.values()];
  }

  async initialize() {
    const timeKey = `Initializing Protocol Price Job for Chain ${this.chain}`;
    this.logger.time(timeKey);
    this.jobsRegistry.registry.forEach((job, key) => {
      if (!job.chains.includes(this.chain)) return;
      this.jobsToRun.set(key, job);
    });
    this.logger.timeEnd(timeKey);
  }

  async update() {
    const timeKey = `Updating Protocol Price Job for Chain ${this.chain}`;
    this.logger.time(timeKey);
    const promises = this.jobs.map((job) => job.update());
    const tokens = (await Promise.all(promises)).flat();
    await this.priceService.savePrices(tokens);
    this.logger.timeEnd(timeKey);
    this.logger.log(`Protocol Price Job Complete for Chain ${this.chain}`);
  }
}
