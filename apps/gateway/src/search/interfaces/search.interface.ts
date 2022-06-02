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

export interface SearchResultsProtocolEntry extends SearchResultsBaseEntry {
  name: string;
  type: SearchResultType.PROTOCOL;
  metadata: ProtocolMetadata;
}
export interface AddressMetadata {
  address: string;
  domain?: string;
}
export interface AssetMetadata extends AddressMetadata {
  chainId: number;
  symbol: string;
}
export interface ProtocolMetadata {
  chains: string[];
  features: string[];
}
export interface SearchParams {
  addresses?: string[];
  text?: string;
  limit?: number;
}
