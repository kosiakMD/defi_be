import { Inject } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { RootPlatform } from '../support/RootPlatform';

export class Blueshift extends RootPlatform {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly moduleRef: ModuleRef,
  ) {
    super();
  }

  async register() {
    this.registerMeta({
      name: this.constructor.name,
      slug: this.constructor.name,
      links: {
        url: 'https://app.blueshift.fi/',
        logo: 'https://app.blueshift.fi/favicon.ico',
        twitter: 'blueshiftfi',
        github: 'blueshift-fi',
        telegram: 'BlueshiftGroup',
      },
    });
  }
}
