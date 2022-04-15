import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { BaseService } from '../common/services/base.service';

import { AddressCandidateDto } from './dto/address-candidate.dto';

@ApiTags('Assets-V2')
@Controller('v2/assets')
export class AssetsV2Controller extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('ASSETS_SERVICE_HOST'),
    this.configService.get<string>('ASSETS_SERVICE_PORT'),
  );

  @Post('candidate')
  @ApiResponse({ status: HttpStatus.OK })
  postAssetsCandidate(@Body() addressCandidateDto: AddressCandidateDto) {
    return this.requestProxy(this.url + 'v1/assets/candidate', 'POST', addressCandidateDto);
  }
}
