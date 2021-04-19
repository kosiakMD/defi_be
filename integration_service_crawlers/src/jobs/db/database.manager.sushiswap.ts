import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { DatabaseManagerUniswap } from './database.manager.uniswap';
import { DatabaseService } from './database.service';

@Injectable()
export class DatabaseManagerSushiswap extends DatabaseManagerUniswap {
  protected mintsTableName = 'sushiswap_mints';
  protected burnsTableName = 'sushiswap_burns';
  protected swapsTableName = 'sushiswap_swaps';
  protected snapshotsTableName = 'sushiswap_snapshots';
  constructor(
    protected databaseService: DatabaseService,
    protected configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {
    super(databaseService, configService, logger);
  }
}
