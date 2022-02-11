import { Controller, Get, HttpStatus, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';

import { FindOneParamsDto } from '../common/dto/FindOneParams.dto';
import { ListQueryDto } from '../common/dto/ListQuery.dto';

import { OpportunityDto } from '../modules/opportunity/dtos/opportunity.dto';
import { OpportunityListDto } from '../modules/opportunity/dtos/opportunity.list.dto';
import { OpportunityService } from '../modules/opportunity/services/opportunity.service';

@ApiTags('Opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(
    private readonly opportunityService: OpportunityService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  @Get('/')
  @ApiResponse({ status: HttpStatus.OK, type: OpportunityListDto })
  get(@Query() query: ListQueryDto): Promise<OpportunityListDto> {
    return this.opportunityService.search(query);
  }

  @Get('/:id')
  @ApiResponse({ status: HttpStatus.OK, type: OpportunityDto })
  findOne(@Param() params: FindOneParamsDto): Promise<OpportunityDto> {
    const { id } = params;
    return this.opportunityService.find(id);
  }

  @Post('/sync')
  @ApiResponse({ status: HttpStatus.OK })
  post(): Promise<{ success: boolean }> {
    return this.opportunityService.sync();
  }
}
