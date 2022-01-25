import { SearchResultType } from './search.enum';
import { SearchResults } from './search.interface';

export const addressSearchResultParser = (address: string, searchResult: SearchResults) => {
  if (searchResult.entries.length === 0) {
    return {
      entries: [
        {
          type: SearchResultType.ADDRESS,
          metadata: {
            address,
          },
        },
      ],
    };
  }
  return searchResult;
};
