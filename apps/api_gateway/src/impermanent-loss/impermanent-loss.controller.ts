import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ImpermanentLossDto, ImpermanentLossResponseDto } from './dto/impermanentLoss.dto';
import { ImpermanentLossService } from './impermanent-loss.service';

@ApiTags('Impermanent loss')
@Controller('v1/impermanent-loss')
export class ImpermanentLossController {
  constructor(private service: ImpermanentLossService) {}

  @Post('/')
  @ApiOkResponse({ type: ImpermanentLossResponseDto })
  getILCalc(@Body() request: ImpermanentLossDto): Promise<ImpermanentLossResponseDto> {
    return this.service.getCalcData(request);
  }
}
