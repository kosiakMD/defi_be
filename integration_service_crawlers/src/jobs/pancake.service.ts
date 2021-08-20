import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PancakeSubgraph } from '../thegraph/pancake/pancake.subgraph';
import { DatabaseManagerPancake } from './db/database.manager.pancake';
import { DatabaseTransactionManager } from './db/database.transaction.manager';
import { UniswapService } from './uniswap.service';

@Injectable()
export class PancakeService extends UniswapService {
  protected integrationName = 'pancake';
  constructor(
    protected configService: ConfigService,
    protected databaseManager: DatabaseManagerPancake,
    protected subgraph: PancakeSubgraph,
    protected dbTransactionManager: DatabaseTransactionManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {
    super(configService, databaseManager, subgraph, dbTransactionManager, logger);
  }
}
