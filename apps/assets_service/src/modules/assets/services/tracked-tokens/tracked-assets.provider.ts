export type TrackedAssetCandidate = {
  chainId: number;
  address: string;
  rank?: number;
};

export interface TrackedAssetsProvider {
  name(): string;
  getTrackedAssetsCandidates(): Promise<TrackedAssetCandidate[]>;
}
