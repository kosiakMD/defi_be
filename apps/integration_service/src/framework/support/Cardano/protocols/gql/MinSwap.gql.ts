import { gql } from '@app/common/utils/graphql';

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
