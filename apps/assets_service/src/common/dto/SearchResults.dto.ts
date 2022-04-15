import { ApiProperty } from '@nestjs/swagger';

import { SearchResultsBaseEntry } from '../interfaces/search.interface';
import { SearchResultsEntryDto } from './SearchResultsEntry.dto';

export class SearchResultsDto {
  @ApiProperty({ type: [SearchResultsEntryDto] })
  entries: SearchResultsBaseEntry[];
}
