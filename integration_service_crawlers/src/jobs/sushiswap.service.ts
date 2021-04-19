import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { SushiswapSubgraph } from '../thegraph/sushiswap/sushiswap.subgraph';
import { DatabaseManagerSushiswap } from './db/database.manager.sushiswap';
import { DatabaseTransactionManager } from './db/database.transaction.manager';
import { UniswapService } from './uniswap.service';

@Injectable()
export class SushiswapService extends UniswapService {
  protected integrationName = 'sushiswap';
  constructor(
    protected configService: ConfigService,
    protected databaseManager: DatabaseManagerSushiswap,
    protected subgraph: SushiswapSubgraph,
    protected dbTransactionManager: DatabaseTransactionManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {
    super(configService, databaseManager, subgraph, dbTransactionManager, logger);
  }
}
