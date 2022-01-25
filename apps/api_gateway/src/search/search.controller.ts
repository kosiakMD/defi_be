import { CacheInterceptor, Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SearchQueryDto } from '../common/DTO/SearchQuery.dto';
import { SearchResultsDto } from '../common/DTO/SearchResults.dto';

import { SearchResults } from './search.interface';
import { SearchService } from './search.service';

@UseInterceptors(CacheInterceptor)
@ApiTags('Search')
@Controller('v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @ApiQuery({
    name: 'text',
    type: String,
    example: '0x0baf7b79f9174c0840aa93a93a2c2a81044a09a2',
  })
  @ApiResponse({ status: 200, type: SearchResultsDto })
  @Get('/')
  search(@Query() query: SearchQueryDto): Promise<SearchResults> {
    const { text } = query;
    return this.searchService.search(text);
  }
}
