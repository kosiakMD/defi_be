/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { JobInterface } from './job.interface';
import { ActiveJobs } from './jobs.module';

@Injectable()
export class JobsRegistry {
  public readonly registry: Map<string, JobInterface> = new Map<string, JobInterface>();

  constructor(private readonly moduleRef: ModuleRef) {
    // Register a new job by adding it to the 'ActiveJobs' list in jobs.module.ts
  }

  async onModuleInit() {
    await Promise.all(
      ActiveJobs.map(async (job) => {
        this.register(await this.moduleRef.create(job));
      }),
    );
  }

  private register(job: JobInterface) {
    this.registry.set(job.placeholder, job);
  }
}
