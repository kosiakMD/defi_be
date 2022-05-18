import series from 'async/series';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainsRepository } from '../../database/repositories/chains.repo';
import { ProtocolChainRepository } from '../../database/repositories/protocol.chain.repo';
import { ProtocolsPropertiesRepository } from '../../database/repositories/protocols.properties.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { TasksAbortChecker } from '../../services/tasks.abort.checker';
import { IAggregator } from '../aggregator.interface';

@Injectable()
export class DefilamaAggregator implements IAggregator {
  readonly api = 'https://api.llama.fi/protocols';
  readonly name = 'DefiLama';
  readonly testRun: boolean;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(ChainsRepository) private readonly chainsRepo: ChainsRepository,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
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
    const list = await firstValueFrom(this.httpService.get(this.api));
    const protocols = this.testRun ? list.data.slice(0, 5) : list.data;
    await series(
      protocols.map((pData) => async () => {
        this.logger.debug(`chains for protocol: ${pData.name} - ${pData.chains}`);
        const chains = await this.chainsRepo.upsertChains(pData.chains);
        const [protocol] = await this.protocolsRepo.upsertProtocols([pData]);
        await this.protocolsPropertiesRepo.upsertProtocolProperties(
          [
            {
              name: 'geckoId',
              value: pData.gecko_id,
            },
            {
              name: 'cmcId',
              value: pData.cmcId,
            },
            {
              name: 'category',
              value: pData.category,
            },
            {
              name: 'TVL',
              value: pData.tvl,
            },
          ],
          this.name,
          protocol,
        );
        await this.protocolChainRepo.upsertProtocolChains(protocol, chains);
        this.tasksAbortChecker.ensureTaskNotAborted();
      }),
    );
  }
}
