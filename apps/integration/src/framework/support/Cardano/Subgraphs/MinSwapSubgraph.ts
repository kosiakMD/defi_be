import { gql } from '@app/common/utils/graphql';

export const LOCKED_FARM_INFO = gql`
  query MintStakingPools($address: String!) {
    mintStakingPools(address: $address) {
      allocPoint
      assetA {
        currencySymbol
        tokenName
      }
      assetB {
        currencySymbol
        tokenName
      }
      lpAsset {
        currencySymbol
        tokenName
      }
      mintStakings {
        amountMint
        baseAPR
        boostAPR
        bonusMultiplier
        duration
        id
        mintPerLP
        lpAmount
        harvestable
        startedAt
        actualPendingReward
        estimatedPendingReward
        extraRewards {
          asset {
            currencySymbol
            tokenName
          }
          baseAPR
          pendingReward
        }
      }
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

export const AVAILABLE_POOLS_QUERY = gql`
  query TopPools($asset: String, $offset: Int, $limit: Int) {
    topPools(asset: $asset, offset: $offset, limit: $limit) {
      assetA {
        currencySymbol
        tokenName
        ...allMetadata
      }
      assetB {
        currencySymbol
        tokenName
        ...allMetadata
      }
      reserveA
      reserveB
      lpAsset {
        currencySymbol
        tokenName
      }
      totalLiquidity
      reserveADA
      volumeADAByDay
      volumeADAByWeek
      tradingFeeARP
    }
  }

  fragment allMetadata on Asset {
    metadata {
      name
      ticker
      url
      decimals
    }
  }
`;

export type IFarmInfoResponse = {
  data: {
    farmPoolInfo: IFarmInfo[];
  };
};

export type ILockedFarmInfoResponse = {
  data: {
    mintStakingPools: IFarmInfo[];
  };
};

export type IPoolInfoResponse = {
  data: {
    topPools: IPoolInfo[];
  };
};

export interface IPoolInfo {
  reserveA: number;
  reserveB: number;
  totalLiquidity: number;
  assetA: CardanoAsset;
  assetB: CardanoAsset;
  lpAsset: CardanoAsset;
}

export interface IFarmInfo {

  totalLiquidityStaking: number;
  liquidityStaking: number;
  pendingReward: number;
  baseAPR: number;
  boostAPR: number;
  allocPoint: number;
  assetA: CardanoAsset;
  assetB: CardanoAsset;
  lpAsset: CardanoAsset;
  bonusMultiplier: number;
  duration: number;
  lpAmount: string;
  amountMint: string;
  startedAt: number;
  estimatedPendingReward: number;

  extraRewards: {
    asset: CardanoAsset;
    baseAPR: number;
    pendingReward: number;
  }[];
}

export interface CardanoAsset {
  currencySymbol: string;
  tokenName: string;
}
