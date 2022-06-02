import { Body, Controller, Get, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

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
  @ApiResponse({ status: HttpStatus.OK })
  async get(@Query() query: AssetsGetBulkDto) {
    return this.requestProxy(this.url + 'v1/assets', 'GET', { params: query });
  }

  @Post('/get-bulk')
  @ApiResponse({ status: HttpStatus.OK })
  async getBulk(@Body() body: AssetsGetBulkDto[]) {
    return this.requestProxy(this.url + 'v1/assets/get-bulk', 'POST', body);
  }

  @Get('/search')
  @ApiResponse({ status: HttpStatus.OK })
  @ApiQuery({
    name: 'address',
    type: String,
    description: 'address to search assets by address',
    example: '0xcd2e72aebe2a203b84f46deec948e6465db51c75',
    required: false,
  })
  @ApiQuery({
    name: 'text',
    type: String,
    description: 'text to search assets by name or symbol',
    example: 'CRO',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'maximal number of search result entries',
    example: 30,
    required: false,
  })
  async search(@Query() query) {
    return this.requestProxy(this.url + 'v1/assets/search', 'GET', { params: query });
  }

  @Post('candidate')
  @ApiResponse({ status: HttpStatus.OK })
  postAssetsCandidate(@Body() addressCandidateDto: AddressCandidateDto) {
    return this.requestProxy(this.url + 'v1/assets/candidate', 'POST', addressCandidateDto);
  }
}
