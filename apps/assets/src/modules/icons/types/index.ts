export type AssetReference = {
  chainId: number;
  address: string;
  symbol?: string;
};

export type AssetIcon = {
  url: string;
  label?: string;
};

export type SavedAssetIcon = {
  url: string;
  fileSize: number;
};
