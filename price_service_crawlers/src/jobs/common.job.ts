import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { Logger } from '../Logger/Logger.service';
import { DatabaseService } from '../services/database.service';
import { toTimestamp } from '../utils/common';
import {
  SECONDS_IN_DAY,
  SECONDS_IN_MONTH,
  SECONDS_IN_30_MIN,
  SECONDS_IN_2_HOURS,
  SECONDS_IN_1_WEEK,
} from '../utils/constants';

@Injectable()
export class CommonJob {
  constructor(
    @Inject(NEST_PGPROMISE_CONNECTION)
    public pg: IDatabase<any>,
    private databaseService: DatabaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  public async removeExtraPrices(job: any, done: any): Promise<void> {
    this.logger.time('Common. Delete extra prices');

    const currentTimeStamp = toTimestamp(new Date());

    // 2 hours for last month. leave 1 price per day
    this.databaseService.removeExtraTokens(SECONDS_IN_DAY, currentTimeStamp - SECONDS_IN_MONTH);

    // every 30 minutes for last week. leave price for every 2hours (for more than week and less then month)
    this.databaseService.removeExtraTokens(
      SECONDS_IN_2_HOURS,
      currentTimeStamp - SECONDS_IN_1_WEEK,
      currentTimeStamp - SECONDS_IN_MONTH,
    );

    // every 5 minutes for last day. leave each 30 minute price for more then day and less then week
    this.databaseService.removeExtraTokens(
      SECONDS_IN_30_MIN,
      currentTimeStamp - SECONDS_IN_DAY,
      currentTimeStamp - SECONDS_IN_1_WEEK,
    );

    done();

    this.logger.timeEnd('Common. Delete extra prices');
  }
}
