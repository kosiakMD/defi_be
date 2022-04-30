import { SearchResultType } from './search.enum';

export interface SearchResults {
  entries: SearchResultsBaseEntry[];
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
  limit?: number;
}
