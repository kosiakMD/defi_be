import { gql } from '@app/common/utils/graphql';

export const getReservesQuery = gql`
  query getReserves {
    reserves {
      id
      name
      underlyingAsset
      symbol
      decimals
      liquidityRate
      stableBorrowRate
      variableBorrowRate
      totalCurrentVariableDebt
      totalPrincipalStableDebt
      totalATokenSupply
      aToken {
        id
        underlyingAssetAddress
        underlyingAssetDecimals
      }
      sToken {
        id
        underlyingAssetAddress
        underlyingAssetDecimals
      }
      vToken {
        id
        underlyingAssetAddress
        underlyingAssetDecimals
      }
    }
  }
`;
