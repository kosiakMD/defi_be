import { parallelLimit, doWhilst, eachLimit } from 'async';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CommandRequestDto } from '../../../common/dto/command.request.dto';

import { Protocol } from '../../database/entities/protocol.entity';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { TasksAbortChecker } from '../../services/tasks.abort.checker';
import { IListContract } from '../interfaces/protocol.interface';
import {
  FETCH_ABI_PARALLEL_LIMIT,
  PROTOCOL_LINKS_PROCESS_PARALLEL_LIMIT,
} from '../protocols.constant';
import { GeneralPageParsing } from '../strategies/contract';
import { AbiFetcherService } from './abi/fetcher/abi.fetcher.service';

@Injectable()
export class ContractsService {
  readonly testRun: boolean;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    private readonly generalParsingPage: GeneralPageParsing,
    private readonly abiFetcherService: AbiFetcherService,
    private readonly configService: ConfigService,
    private readonly tasksAbortChecker: TasksAbortChecker,
  ) {
    this.testRun = JSON.parse(configService.get('TEST_RUN'));
  }

  async scanWebsitesForContracts(websites: { url: string; protocol: Protocol }[]): Promise<void> {
    this.logger.log('scanWebsitesForContracts started');
    await parallelLimit(
      websites.map(({ url, protocol }) => async () => {
        try {
          this.logger.debug(`parse url: [${url}]`);
          const resultParsing = await this.generalParsingPage.parsing({ url });
          const contracts = resultParsing.map((address) => ({ address, protocol }));
          await this.saveContracts(contracts);
        } catch (e) {
          this.logger.error(`Parsing page [${url}], error [${e.message}]`);
        }
        this.tasksAbortChecker.ensureTaskNotAborted();
      }),
      PROTOCOL_LINKS_PROCESS_PARALLEL_LIMIT,
    );
    this.logger.log('scanWebsitesForContracts finished');
  }

  private async saveContracts(listContracts: IListContract[]) {
    const find = await this.contractsRepository.find({
      where: listContracts.map((a) => ({ address: a?.address, protocol: a?.protocol })),
    });

    const sortByAddress = new Map(find.map((f) => [f.address, f]));

    const filteredAddresses = listContracts?.filter((a) => !sortByAddress.has(a?.address));

    await this.contractsRepository.save(filteredAddresses);
  }

  async fetchAbiAndAbiCode(request: CommandRequestDto) {
    this.logger.log('fetchAbiAndAbiCode started');
    let processed = 0;
    await doWhilst(
      async () => this.contractsRepository.findByFetchedAbiFlag(request.includeProcessed),
      async (contracts) => {
        await eachLimit(contracts, FETCH_ABI_PARALLEL_LIMIT, async ({ id, address }) => {
          //fetch ABI and ABI Code
          this.logger.debug(`fetchAbiAndAbiCode for address: ${address}`);
          const { chain, abi, abiCode } = await this.abiFetcherService.fetchAbiAndAbiCode(address);

          //update DB info
          await this.contractsRepository.update({ id }, { abi, abiCode, chain, fetchedAbi: true });
          this.tasksAbortChecker.ensureTaskNotAborted();
        });
        processed += contracts.length;
        this.logger.debug(`fetched abi for [${processed}] contracts`);
        return !!contracts.length;
      },
    );
    this.logger.log('fetchAbiAndAbiCode finished');
  }
}
