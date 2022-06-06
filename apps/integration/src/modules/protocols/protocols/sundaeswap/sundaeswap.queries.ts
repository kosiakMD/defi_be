import { gql } from '@app/common/utils/graphql';

export const FARMS_BY_ADDRESS_QUERY = gql`
  query freezerOpen($address: String!, $pageSize: Int, $token: String) {
    freezerOpen(address: $address, pageSize: $pageSize, token: $token) {
      token
      items {
        ...FreezerItemFragment
      }
    }
    now {
      format(layout: "2006-01-02T15:04:05Z")
    }
  }

  fragment FreezerItemFragment on FreezerItem {
    __typename
    assetID
    earned
    rewards {
      asset {
        ...AssetFragment
      }
      quantity
    }
    rewardsMatured {
      asset {
        ...AssetFragment
      }
      quantity
    }
    startDate {
      format(layout: "2006-01-02T15:04:05Z")
    }
    nextRewardAt {
      format(layout: "2006-01-02T15:04:05Z")
    }
    quantity
    term
    utxo {
      ...UtxoFragment
    }
    pool {
      ...PoolFragment
    }
  }

  fragment AssetFragment on Asset {
    assetId
    policyId
    assetName
    decimals
    logo
    ticker
    dateListed
    sources
  }

  fragment UtxoFragment on Utxo {
    address
    txHash
    index
    coins
    datumHash
    assets {
      quantity
      assetID
    }
  }

  fragment PoolFragment on Pool {
    apr
    rewards {
      apr
      asset {
        ...AssetFragment
      }
    }
    assetA {
      ...AssetFragment
    }
    assetB {
      ...AssetFragment
    }
    assetLP {
      ...AssetFragment
    }
    fee
    quantityA
    quantityB
    quantityLP
    ident
    assetID
  }
`;
