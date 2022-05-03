import { Job } from 'bull';

import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { REDIS_TASK_QUEUE, COMMON_TASK } from '../../common/constants';
import { ListProtocolsDTO } from '../../common/dto/service.dto';
import {
  CommandUnparameterized,
  CommandParameterized,
  CommandType,
} from '../../common/enum/service.enum';

import { AggregatorsService } from '../aggregators/aggregator.service';
import { ProtocolService } from '../protocols/protocols.service';
import { ContractsAnalysisService } from '../protocols/services/contracts.analysis.service';
import { ContractsAnalysisServiceV1 } from '../protocols/services/contracts.analysis.service.v1';

@Injectable()
@Processor(REDIS_TASK_QUEUE)
export class TasksProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly aggregatorsService: AggregatorsService,
    private readonly protocolService: ProtocolService,
    private readonly contractAnalysisService: ContractsAnalysisService,
    private readonly contractsAnalysisServiceV1: ContractsAnalysisServiceV1,
  ) {}

  @Process(COMMON_TASK) // the name of the executed task
  public async process(
    job: Job<{
      command: CommandType;
      listProtocol?: ListProtocolsDTO;
      similarData: { contract: string };
    }>,
  ) {
    this.logger.debug(`job: '${job.data.command}'`);
    switch (job.data.command) {
      case CommandUnparameterized.start_fetching: {
        await this.aggregatorsService.run();
        await this.protocolService.parseProtocolsMainPage();
        await this.protocolService.parseProtocolsAppPage();
        await this.protocolService.parseProtocolsDocsPage();
        // await this.protocolService.parseProtocolsGithubPage(); //enable it when needed
        await this.protocolService.crawlHtml();
        await this.protocolService.fetchAbi();
        await this.contractAnalysisService.analyseContracts();
        return;
      }
      case CommandUnparameterized.fetch_protocols:
        return this.aggregatorsService.run();
      case CommandUnparameterized.parse_protocols_app_page:
        return this.protocolService.parseProtocolsAppPage();
      case CommandUnparameterized.parse_protocols_main_page:
        return this.protocolService.parseProtocolsMainPage();
      case CommandUnparameterized.parse_protocols_docs_page:
        return this.protocolService.parseProtocolsDocsPage();
      case CommandUnparameterized.crawl_html:
        return this.protocolService.crawlHtml();
      case CommandUnparameterized.fetch_abi:
        return this.protocolService.fetchAbi();
      case CommandUnparameterized.parse_protocols_github_page:
        return this.protocolService.parseProtocolsGithubPage();
      case CommandUnparameterized.analyse_contracts:
        return this.contractsAnalysisServiceV1.analyseContracts();
      case CommandUnparameterized.analyse_contracts_against_templates:
        return this.contractAnalysisService.analyzeContractsAgainstTemplates();
      case CommandParameterized.run_parsing_custom_protocol:
        return this.protocolService.parseCustomProtocol(job.data.listProtocol);
      case CommandParameterized.similar_contract:
        return this.contractAnalysisService.findSimilarAbiAndAbiCode(job.data.similarData);
      default:
        this.logger.warn(`unsupported command: '${job.data.command}', skipping...`);
    }
  }

  @OnQueueActive()
  public onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type [${job.name}]`);
  }

  @OnQueueCompleted()
  public onComplete(job: Job) {
    this.logger.debug(`Completed job ${job.id} of type [${job.name}]`);
  }

  @OnQueueFailed()
  public onError(job: Job<any>, error: any) {
    this.logger.error(`Failed job ${job.id} of type [${job.name}]: ${error.message}`, error.stack);
  }
}
