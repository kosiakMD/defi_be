import { Job } from 'bull';

import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { REDIS_TASK_QUEUE, REGULAR_TASK } from '../../common/constants';
import { CommandRequestDto } from '../../common/dto/command.request.dto';
import { ContractAnalyseRequestDto } from '../../common/dto/contract.analyse.request.dto';
import { IJobPayload } from '../../common/dto/job/job.payload.interface';
import { ProtocolAnalyseRequestDto } from '../../common/dto/protocol.analyse.request.dto';
import { ExternalCommand, InternalCommand } from '../../common/enum/service.enum';
import { TaskAbortError } from '../../common/errors/task.abort.error';

import { AggregatorsService } from '../aggregators/aggregator.service';
import { ProtocolService } from '../protocols/protocols.service';
import { ContractsAnalysisServiceV1 } from '../protocols/services/contracts.analysis.service.v1';
import { TasksService } from './tasks.service';

@Injectable()
@Processor(REDIS_TASK_QUEUE)
export class TasksProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly aggregatorsService: AggregatorsService,
    private readonly protocolService: ProtocolService,
    private readonly contractsAnalysisServiceV1: ContractsAnalysisServiceV1,
    private readonly tasksService: TasksService,
  ) {}

  @Process(REGULAR_TASK) // the name of the executed task
  async processWithAbort(job: Job<IJobPayload>) {
    try {
      await this.process(job);
    } catch (e) {
      if (e instanceof TaskAbortError) {
        this.logger.log(`job aborted: '${job.data.command}'`);
        return;
      }
      throw e;
    }
  }

  private async process(job: Job<IJobPayload>) {
    this.logger.debug(`job: '${job.data.command}'`);
    switch (job.data.command) {
      case ExternalCommand.start_fetching: {
        for (const command of [
          ExternalCommand.fetch_protocols,
          ExternalCommand.parse_protocols_main_page,
          ExternalCommand.parse_protocols_app_page,
          ExternalCommand.parse_protocols_docs_page,
          ExternalCommand.fetch_abi,
          ExternalCommand.analyse_contracts_against_templates,
        ]) {
          await this.tasksService.queueTask({ ...job.data, command });
        }
        return;
      }
      case ExternalCommand.fetch_protocols:
        return this.aggregatorsService.run();
      case ExternalCommand.parse_protocols_app_page:
        return this.protocolService.parseProtocolsAppPage(job.data as CommandRequestDto);
      case ExternalCommand.parse_protocols_main_page:
        return this.protocolService.parseProtocolsMainPage();
      case ExternalCommand.parse_protocols_docs_page:
        return this.protocolService.parseProtocolsDocsPage(job.data as CommandRequestDto);
      case ExternalCommand.crawl_html:
        return this.protocolService.crawlHtml();
      case ExternalCommand.fetch_abi:
        return this.protocolService.fetchAbi(job.data as CommandRequestDto);
      case ExternalCommand.parse_protocols_github_page:
        return this.protocolService.parseProtocolsGithubPage();
      case ExternalCommand.analyse_contracts:
        return this.contractsAnalysisServiceV1.analyseContracts();
      case ExternalCommand.analyse_contracts_against_templates:
        return this.contractsAnalysisServiceV1.analyzeContractsAgainstTemplates();
      case InternalCommand.protocol_analyse:
        return this.protocolService.parseCustomProtocol(job.data as ProtocolAnalyseRequestDto);
      case InternalCommand.contract_analyse:
        return this.contractsAnalysisServiceV1.findSimilarAbiAndAbiCode(
          job.data as ContractAnalyseRequestDto,
        );
      default:
        this.logger.warn(`unsupported command: '${job.data.command}', skipping...`);
    }
  }

  @OnQueueActive()
  public onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id}`);
  }

  @OnQueueCompleted()
  public onComplete(job: Job) {
    this.logger.debug(`Completed job ${job.id}`);
  }

  @OnQueueFailed()
  public onError(job: Job, error: any) {
    this.logger.error(`Failed job ${job.id}: ${error.message}`, error.stack);
  }
}
