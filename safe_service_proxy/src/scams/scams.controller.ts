import { Controller, Get, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { FilterOptionsQueryDto } from 'src/common/dto/filter.options.query.dto';

import { ScamFunctionResponseDto, ScamsResponseDto } from './dto';
import { ScamTypeResponseDto } from './dto/scam.type.response.dto';
import { ScamsService } from './scams.service';

@ApiTags('Scams')
@Controller('scams')
export class ScamsController {
  constructor(protected readonly scamsService: ScamsService) {}

  @Get('')
  @ApiResponse({ status: 200, type: ScamsResponseDto })
  getScams(@Query() query: FilterOptionsQueryDto): Promise<ScamsResponseDto> {
    return this.scamsService.getScams(query);
  }

  @Get('types')
  @ApiResponse({ status: 200, type: [ScamTypeResponseDto] })
  getScamTypes(): Promise<ScamTypeResponseDto[]> {
    return this.scamsService.getScamTypes();
  }

  @Get('functions')
  @ApiResponse({ status: 200, type: [ScamFunctionResponseDto] })
  getScamFunctions(): Promise<ScamFunctionResponseDto[]> {
    return this.scamsService.getScamFunctions();
  }
}
