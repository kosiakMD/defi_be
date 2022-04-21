export type Chain = {
  id: number;
  metadata: ChainMetadata;
};

type ChainMetadata = {
  absoluteChainId: string;
  coingeckoPlatformId: string;
  coinmarketcapPlatformName: string;
  debankPlatformId: string;
  balancesCheckerAddress: string;
  network: {
    type: string;
  };
};
