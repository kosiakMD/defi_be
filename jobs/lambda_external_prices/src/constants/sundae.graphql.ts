import { gql } from '@app/common/utils/graphql';

export const SUNDAE_GRAPHQL_QUERY = gql`
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
    assetB {
      ...AssetFragment
    }
    assetID
  }

  fragment AssetFragment on Asset {
    assetId
    policyId
    assetName
    decimals
    ticker
  }

  fragment PoolInfoFragment on Pool {
    priceUSD
  }
`;
