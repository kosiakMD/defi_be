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

  async updateJob(job: IntegrationJob): Promise<IntegrationJob> {
    const manager = getManager();
    const insertQuery = `
        update public.job_integrations
        set chain_id         = $1,
            feature          = $2,
            protocol         = $3,
            settings         = $4,
            updated_at       = current_timestamp,
            is_enabled       = $5,
            update_frequency = $6
        where id = $7 returning *
    `;
    await manager.query(insertQuery, [
      job.chainId,
      job.feature,
      job.protocol,
      JSON.stringify(job.settings),
      job.isEnabled,
      job.updateFrequency,
      job.id,
    ]);
    return plainToClass(
      IntegrationJob,
      await manager.query('select * from job_integrations where id = $1', [job.id]),
    );
  }
}
