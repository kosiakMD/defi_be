interface IToken {
  policyId: string;
  assetName: string;
  quantity: string;
}

export interface IUtxo {
  id: number;
  tag: string;
  cuOutIndex: number;
  cuAddress: string;
  cuId: string;
  cuCoins: {
    getCoin: string;
    getTokens: IToken[];
  };
  cuDatumValue: string;
  cuDatumHash: string;
  creationTime: string;
}

export interface IFarmingRewards {
  poolId: string;
  epoch: number;
  tokenBundle: IToken[];
}
