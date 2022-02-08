import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { AssetsService } from './assets.service';
import { AssetCreateDto } from './dto/AssetCreate.dto';

@ApiTags('Assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post('/')
  @ApiResponse({ status: HttpStatus.OK })
  post(@Body() body: AssetCreateDto): Promise<void> {
    return this.assetsService.createAsset(body);
  }

  @Post('/bulk')
  @ApiResponse({ status: HttpStatus.OK })
  postBulk(@Body() body: AssetCreateDto[]): Promise<void> {
    return this.assetsService.createBulkAssets(body);
  }
}
