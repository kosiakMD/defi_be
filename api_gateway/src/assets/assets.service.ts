import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable } from '@nestjs/common';

import { AccountService } from '../account/account.service';
import { AssetsDto } from './assets.dto';
import { Logger } from 'src/common/Logger/Logger.service';

@Injectable()
export class AssetsService {
  constructor(
    private accountService: AccountService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  async getAllAssets(): Promise<AssetsDto[]> {
    try {
      return await this.accountService.getAssets();
    } catch (e) {
      this.logger.error(e, 'AssetsService.getAllAssets');
      throw e;
    }
  }
}
