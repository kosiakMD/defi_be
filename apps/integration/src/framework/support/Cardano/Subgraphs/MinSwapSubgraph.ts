import { gql } from '@app/common/utils/graphql';

export const FARMS_BY_ADDRESS_QUERY = gql`
  query FarmPoolInfo($address: String!) {
    farmPoolInfo(address: $address) {
      lpAsset {
        currencySymbol
        tokenName
      }
      liquidityStaking
      pendingReward
      baseAPR
    }
  }
`;
export const FARM_POOL_INFO = gql`
  query FarmPoolInfo($address: String!) {
    farmPoolInfo(address: $address) {
      lpAsset {
        currencySymbol
        tokenName
      }
      assetA {
        currencySymbol
        tokenName
      }
      assetB {
        currencySymbol
        tokenName
      }
      extraRewards {
        asset {
          currencySymbol
          tokenName
        }
        baseAPR
        pendingReward
      }
      totalLiquidityStaking
      liquidityStaking
      pendingReward
      baseAPR
      boostAPR
      allocPoint
    }
  }
`;

export type IFarmPoolInfoResponse = {
  data: {
    farmPoolInfo: IFarmPoolInfo[];
  };
};

export interface IFarmPoolInfo {
  allocPoint: number;
  assetA: CardanoAsset;
  assetB: CardanoAsset;
  lpAsset: CardanoAsset;
  baseAPR: number;
}

export interface CardanoAsset {
  currencySymbol: string;
  tokenName: string;
}
