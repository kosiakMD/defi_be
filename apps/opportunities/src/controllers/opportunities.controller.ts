import { Controller, Get, HttpStatus, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { OpportunitySearchQueryDto } from '@app/common/dto/opportunities/OpportunitySearchQuery.dto';
import { OpportunityDto } from '@app/common/dto/opportunities/opportunity.dto';
import { OpportunityListDto } from '@app/common/dto/opportunities/opportunity.list.dto';

import { FindOneParamsDto } from '../common/dto/FindOneParams.dto';

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
  get(@Query() query: OpportunitySearchQueryDto): Promise<OpportunityListDto> {
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
