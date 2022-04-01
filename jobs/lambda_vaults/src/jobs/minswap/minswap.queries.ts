import { gql } from '@app/common/utils/graphql';

export const AVAILABLE_POOLS_QUERY = gql`
  query TopPools($assetName: String, $offset: Int, $limit: Int) {
    topPools(assetName: $assetName, offset: $offset, limit: $limit) {
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
      pendingOrders
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
