export interface IChainMetadata {
  absoluteChainId: string;
  coingeckoPlatformId: string;
  debankPlatformId: string;
  balancesCheckerAddress: string;
  balancesCheckerBatchSize: number;
  network: {
    type: string;
  };
}
