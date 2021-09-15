import { plainToClass } from 'class-transformer';
import { getManager } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { IntegrationJob } from './dto/db.dto';

@Injectable()
export class IntegrationJobsRepository {
  async getAvailablePools(): Promise<IntegrationJob[]> {
    const manager = getManager();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return plainToClass(IntegrationJob, await manager.query('select * from job_integrations'));
  }
}
