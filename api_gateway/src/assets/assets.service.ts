import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AccountService } from '../account/account.service';
import { Logger } from '../common/Logger/Logger.service';
import { AssetsDto } from './assets.dto';

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
