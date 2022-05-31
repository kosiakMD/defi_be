import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { BaseService } from '../common/services/base.service';

import { ImpermanentLossDto, ImpermanentLossResponseDto } from './dto/impermanentLoss.dto';

@ApiTags('Impermanent loss')
@Controller('v1/impermanent-loss')
export class ImpermanentLossController extends BaseService {
  url = 'https://ilapi1.defiyield.info/api/v2/calc';

  @Post('/')
  @ApiOkResponse({ type: ImpermanentLossResponseDto })
  getILCalc(@Body() request: ImpermanentLossDto): Promise<ImpermanentLossResponseDto> {
    return this.requestProxy(this.url, 'POST', request);
  }
}
