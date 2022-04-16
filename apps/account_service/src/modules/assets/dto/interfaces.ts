import { SearchResultType } from "defiyield-gateway/dist/src/search/interfaces/search.enum";

export interface AddressMetadata {
  address: string;
}

export interface AssetMetadata extends AddressMetadata {
  chainId: number;
  symbol: string;
}

export interface SearchResultsBaseEntry {
  type: SearchResultType;
}

export interface SearchResultsAddressEntry extends SearchResultsBaseEntry {
  type: SearchResultType.ADDRESS;
  metadata: AddressMetadata;
}

export interface SearchParams {
  address?: string;
  text?: string;
  limit?: number;
}

export interface SearchResultsAssetEntry extends SearchResultsBaseEntry {
  name: string;
  icon: string;
  type: SearchResultType.ASSET;
  metadata: AssetMetadata;
}