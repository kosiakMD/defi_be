import { Controller, Get, Inject, LoggerService } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AssetsDto } from './assets.dto';
import { AssetsService } from './assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
  ) {}
  @Get('')
  @ApiResponse({ status: 200, type: AssetsDto, isArray: true })
  async getAllAssets(): Promise<AssetsDto[]> {
    try {
      return await this.assetsService.queryAllAssets();
    } catch (e) {
      this.logger.error(e, 'AssetsController.getAllAssets');
      throw e;
    }
  }
}
