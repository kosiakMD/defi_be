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
        ...allMetadata
      }
      assetB {
        currencySymbol
        tokenName
        ...allMetadata
      }
      extraRewards {
        asset {
          currencySymbol
          tokenName
          ...allMetadata
        }
        baseAPR
        pendingReward
      }
      totalLiquidityStaking
      liquidityStaking
      pendingReward
      baseAPR
      boostAPR
      # boosterRate
      # stakingUtxo
      allocPoint
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
