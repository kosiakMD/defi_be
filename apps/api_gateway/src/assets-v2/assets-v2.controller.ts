import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { BaseService } from '../common/services/base.service';

import { AddressCandidateDto } from './dto/address-candidate.dto';
import { AssetsGetBulkDto } from './dto/assets-get.dto';

@ApiTags('Assets-V2')
@Controller('v2/assets')
export class AssetsV2Controller extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('ASSETS_SERVICE_HOST'),
    this.configService.get<string>('ASSETS_SERVICE_PORT'),
  );

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, isArray: true })
  async get(@Query() query: AssetsGetBulkDto) {
    return this.requestProxy(this.url + 'v1/assets/', 'GET', query);
  }

  @Post('/get-bulk')
  @ApiResponse({ status: HttpStatus.OK })
  async getBulk(@Body() body: AssetsGetBulkDto[]) {
    return this.requestProxy(this.url + 'v1/assets/get-bulk', 'POST', body);
  }

  @Get('/search')
  @ApiResponse({ status: HttpStatus.OK })
  async search(@Query() query) {
    return this.requestProxy(this.url + 'v1/assets/search', 'GET', query);
  }

  @Post('candidate')
  @ApiResponse({ status: HttpStatus.OK })
  postAssetsCandidate(@Body() addressCandidateDto: AddressCandidateDto) {
    return this.requestProxy(this.url + 'v1/assets/candidate', 'POST', addressCandidateDto);
  }
}
