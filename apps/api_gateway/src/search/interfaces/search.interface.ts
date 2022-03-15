import { OpportunityDto } from 'apps/opportunities_service/src/modules/opportunity/dtos/opportunity.dto';

import { SearchResultType } from './search.enum';

export interface SearchResults {
  entries: (SearchResultsBaseEntry | OpportunityDto)[];
}
export interface SearchResultsBaseEntry {
  type: SearchResultType;
}
export interface SearchResultsAddressEntry extends SearchResultsBaseEntry {
  type: SearchResultType.ADDRESS;
  metadata: AddressMetadata;
}
export interface SearchResultsAssetEntry extends SearchResultsBaseEntry {
  name: string;
  icon: string;
  type: SearchResultType.ASSET;
  metadata: AssetMetadata;
}
export interface AddressMetadata {
  address: string;
}
export interface AssetMetadata extends AddressMetadata {
  chainId: number;
  symbol: string;
}
export interface SearchParams {
  address?: string;
  text?: string;
}
