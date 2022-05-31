import { ApiProperty } from '@nestjs/swagger';

import { SearchResultsBaseEntry } from '../../search/interfaces/search.interface';
import { SearchResultsEntryDto } from './search-results-entry.dto';

export class SearchResultsDto {
  @ApiProperty({ type: [SearchResultsEntryDto] })
  entries: SearchResultsBaseEntry[];
}
