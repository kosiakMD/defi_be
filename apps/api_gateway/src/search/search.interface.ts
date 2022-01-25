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
export interface SearchResultsProjectEntry extends SearchResultsBaseEntry {
  name: string;
  icon: string;
  type: SearchResultType.PROJECT;
  metadata: ProjectMetadata;
}
export interface SearchResultsVaultEntry extends SearchResultsBaseEntry {
  type: SearchResultType.VAULT;
  metadata: VaultMetadata;
}
export interface AddressMetadata {
  address: string;
}
export interface AssetMetadata extends AddressMetadata {
  chainId: number;
  symbol: string;
}
export interface ProjectMetadata extends AddressMetadata {
  description: string;
}
export interface VaultMetadata {
  chainId: number;
  protocol: string;
  feature: string;
}
export interface SearchParams {
  address?: string;
  text?: string;
}
