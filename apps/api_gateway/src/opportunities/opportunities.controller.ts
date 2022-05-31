import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

import { OpportunitySearchQueryDto } from '@app/common/dto/opportunities/OpportunitySearchQuery.dto';
import { OpportunityListDto } from '@app/common/dto/opportunities/opportunity.list.dto';

import { BaseService } from '../common/services/base.service';

@ApiTags('Opportunities')
@Controller('v1/opportunities')
export class OpportunitiesController extends BaseService {
  url = this.buildUrl(
    this.configService.get<string>('OPPORTUNITIES_SERVICE_HOST'),
    this.configService.get<string>('OPPORTUNITIES_SERVICE_PORT'),
  );

  @ApiResponse({ status: HttpStatus.OK, type: OpportunityListDto })
  @Get('/')
  public async getOpportunities(
    @Query() query: OpportunitySearchQueryDto,
  ): Promise<OpportunityListDto> {
    return this.requestProxy(new URL('v1/opportunities', this.url).href, 'GET', { params: query });
  }
}
