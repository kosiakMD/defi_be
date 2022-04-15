import { SearchResultType } from '../enum/SearchResultType.enum';

export interface SearchResults {
  entries: SearchResultsBaseEntry[];
}
export interface SearchResultsBaseEntry {
  type: SearchResultType;
}
export interface SearchResultsAssetEntry extends SearchResultsBaseEntry {
  name: string;
  icon: string;
  type: SearchResultType.ASSET;
  metadata: AssetMetadata;
}
export interface AssetMetadata {
  address: string;
  chainId: number;
  symbol: string;
}
export interface SearchParams {
  address?: string;
  text?: string;
  limit?: number;
}
