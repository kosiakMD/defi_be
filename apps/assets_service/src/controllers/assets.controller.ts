import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { AssetsGetDto } from '../modules/assets/dto/assets-get.dto';
import { AssetsEntity } from '../modules/assets/entities/assets.entity';
import { AssetsService } from '../modules/assets/services/assets.service';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK })
  // TODO: Create DTO instead of database objects
  // TODO: Return prices for assets
  get(@Query() query: AssetsGetDto): Promise<AssetsEntity> {
    return this.assetsService.getAsset(query);
  }

  @Post('/get-bulk')
  @ApiResponse({ status: HttpStatus.OK })
  getBulk(@Body() body: AssetsGetDto[]): Promise<AssetsEntity[]> {
    return this.assetsService.getBulkAssets(body);
  }
}
