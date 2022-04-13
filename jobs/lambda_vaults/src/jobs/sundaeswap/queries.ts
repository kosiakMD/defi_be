import { gql } from '@app/common/utils/graphql';

export const AVAILABLE_POOLS_QUERY = gql`
  query getPopularPools($pageSize: Int) {
    poolsPopular(pageSize: $pageSize) {
      ...ExtendPoolFragment
    }
  }
  fragment ExtendPoolFragment on Pool {
    ...PoolFragment
    ...PoolInfoFragment
  }
  fragment PoolFragment on Pool {
    assetA {
      ...AssetFragment
    }
    assetB {
      ...AssetFragment
    }
    assetLP {
      ...AssetFragment
    }
    apr
    fee
    quantityA
    quantityB
    quantityLP
  }
  fragment AssetFragment on Asset {
    assetId
    assetName
    decimals
    ticker
  }
  fragment PoolInfoFragment on Pool {
    tvl
    name
    priceUSD
  }
`;
