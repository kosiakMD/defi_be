import { gql } from '@app/common/utils/graphql';

export const getLendingPositionsQuery = gql`
  query getLendingPositions($addresses: [String]) {
    users(where: { id_in: $addresses }) {
      id
      kashiPairs {
        pair {
          id
          type
          name
          symbol

          supplyAPR
          borrowAPR
          utilization

          asset {
            name
            symbol
            decimals
            id
          }

          collateral {
            id
            name
            symbol
            decimals
          }
        }

        borrowPart
        collateralShare
        assetFraction
      }

      tokens(where: { share_gt: 0 }) {
        share
        token {
          symbol
        }
      }
    }
  }
`;
