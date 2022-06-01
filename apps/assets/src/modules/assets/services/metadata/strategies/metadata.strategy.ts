export interface AssetMetadata {
  name?: string;
  symbol?: string;
  decimals: number;
}

export interface MetadataStrategy {
  getMetadata(address: string, chainId: number): Promise<AssetMetadata>;
}
