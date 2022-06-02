export interface IUserFarmingReward {
  poolId: string;
  epoch: number;
  tokenBundle: {
    policyId: string;
    assetName: string;
    quantity: string;
  }[];
}
