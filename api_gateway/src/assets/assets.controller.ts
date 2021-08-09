import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Get } from '@nestjs/common';
import { Controller, Inject } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { AssetsDto } from './assets.dto';
import { AssetsService } from './assets.service';
import { Logger } from 'src/common/Logger/Logger.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsService: AssetsService,
  ) {}
  @Get('')
  @ApiResponse({ status: 200, type: AssetsDto, isArray: true })
  async queryAllAssets(): Promise<AssetsDto[]> {
    try {
      return await this.assetsService.getAllAssets();
    } catch (e) {
      this.logger.error(e, 'AssetsService.queryAllAssets');
      throw e;
    }
  }
}
