import { Body, Controller, Get, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { AssetsService } from './assets.service';
import { AssetGetDto } from './dto/AssetGet.dto';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK })
  get(@Body() body: AssetGetDto): Promise<void> {
    return this.assetsService.getAsset(body);
  }

  // we use POST to get bulk of assets because of GET limitations
  @Post('/get-bulk')
  @ApiResponse({ status: HttpStatus.OK })
  getBulk(@Body() body: AssetGetDto[]): Promise<void> {
    return this.assetsService.getBulkAssets(body);
  }
}
