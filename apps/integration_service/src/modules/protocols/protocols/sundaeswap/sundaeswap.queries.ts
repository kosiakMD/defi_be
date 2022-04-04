import { gql } from '@app/common/utils/graphql';

export const FARMS_BY_ADDRESS_QUERY = gql`
  query freezerOpen($address: String!, $pageSize: Int, $token: String) {
    freezerOpen(address: $address, pageSize: $pageSize, token: $token) {
      token
      items {
        ...FreezerItemFragment
      }
    }
  }

  fragment FreezerItemFragment on FreezerItem {
    assetID
    earned
    nextRewardAt {
      format(layout: "2006-01-02T15:04:05Z")
    }
    quantity
    pool {
      ...PoolFragment
    }
  }

  fragment PoolFragment on Pool {
    apr
    quantityA
    quantityB
  }
`;
