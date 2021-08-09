import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DatabaseManagerUniswap } from './database.manager.uniswap';
import { DatabaseService } from './database.service';

@Injectable()
export class DatabaseManagerPancake extends DatabaseManagerUniswap {
  protected mintsTableName = 'pancake_mints';
  protected burnsTableName = 'pancake_burns';
  protected swapsTableName = 'pancake_swaps';
  protected snapshotsTableName = 'pancake_snapshots';
  constructor(
    protected databaseService: DatabaseService,
    protected configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {
    super(databaseService, configService, logger);
  }
}
