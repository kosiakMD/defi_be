import { Controller, Get, Inject, LoggerService } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AssetsEntity } from './assets.entity';
import { AssetsService } from './assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}
  @Get('')
  @ApiResponse({ status: 200, type: AssetsEntity, isArray: true })
  async getAllAssets(): Promise<AssetsEntity[]> {
    try {
      return await this.assetsService.queryAllAssets();
    } catch (e) {
      this.logger.error(e, 'AssetsController.getAllAssets');
      throw e;
    }
  }
}
