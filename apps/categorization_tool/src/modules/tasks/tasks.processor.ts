import { Job } from 'bull';

import { OnQueueActive, OnQueueCompleted, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { REDIS_TASK_QUEUE, TASKS_PROCESSOR } from '../../common/constants';
import { Command } from '../../common/enum/service.enum';

import { AggregatorsService } from '../aggregators/aggregator.service';
import { IListProtocol } from '../protocols/interfaces/protocol.interface';
import { ProtocolService } from '../protocols/protocols.service';

@Injectable()
@Processor(REDIS_TASK_QUEUE)
export class TasksProcessor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly aggregatorsService: AggregatorsService,
    private readonly protocolService: ProtocolService,
  ) {}

  @Process(TASKS_PROCESSOR) // the name of the executed process
  public async process(
    job: Job<{ command: string; listProtocols?: IListProtocol[]; urls?: string }>,
  ) {
    this.logger.debug(`job: '${job.data.command}'`);
    switch (job.data.command) {
      case Command.start_fetching:
        return this.aggregatorsService.run();
      case Command.parse_protocols_app_page:
        return this.protocolService.scanAppPageProtocolsForLinks();
      case Command.parse_protocols_main_page:
        return this.protocolService.scanMainPageProtocolsForLinks();
      case Command.parse_protocols_docs_page:
        return this.protocolService.scanDocsPageProtocolsForContractAdresses();
      case Command.crawl_html:
        return this.protocolService.crawlHtml();
      case Command.fetch_abi:
        return this.protocolService.fetchAbi();
      case Command.parse_github:
        return this.protocolService.parseGithubLinks();
      case Command.run_parsing_protocols:
        return this.protocolService.run();
      case Command.run_parsing_custom_protocol:
        return this.protocolService.run(job.data.listProtocols);
      default:
        this.logger.warn(`unsupported command: '${job.data.command}', skipping...`);
    }
  }

  @OnQueueActive()
  public onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);
  }

  @OnQueueCompleted()
  public onComplete(job: Job) {
    this.logger.debug(`Completed job ${job.id} of type ${job.name}`);
  }

  @OnQueueFailed()
  public onError(job: Job<any>, error: any) {
    this.logger.error(`Failed job ${job.id} of type ${job.name}: ${error.message}`, error.stack);
  }
}
