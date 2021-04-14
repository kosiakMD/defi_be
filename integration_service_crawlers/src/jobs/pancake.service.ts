import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DatabaseManagerPancake } from './db/database.manager.pancake';
import { PancakeSubgraph } from '../thegraph/pancake/pancake.subgraph';
import { UniswapService } from './uniswap.service';
import { DatabaseTransactionManager } from './db/database.transaction.manager';

@Injectable()
export class PancakeService extends UniswapService {
  protected integrationName: string = 'pancake'
  constructor(
    protected configService: ConfigService,
    protected databaseManager: DatabaseManagerPancake,
    protected subgraph: PancakeSubgraph,
    protected dbTransactionManager: DatabaseTransactionManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {
    super(configService, databaseManager, subgraph, dbTransactionManager, logger)
  }
}
