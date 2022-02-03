import {
  CacheInterceptor,
  Controller,
  Get,
  HttpStatus,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { SearchResultsDto } from '../common/DTO/SearchResults.dto';

import { SearchResults } from './interfaces/search.interface';
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
  @ApiResponse({ status: HttpStatus.OK, type: SearchResultsDto })
  @Get('/')
  search(@Query() query): Promise<SearchResults> {
    const { text } = query;
    return this.searchService.search(text);
  }
}
