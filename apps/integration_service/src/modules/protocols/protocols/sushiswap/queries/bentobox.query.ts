import { gql } from '@app/common/utils/graphql';

import { erc20Fields } from './fragments/token.fragment';

export const getLendingPositionsQuery = gql`
  ${erc20Fields}
  query getLendingPositions($addresses: [String]) {
    users(where: { id_in: $addresses }) {
      id
      kashiPairs {
        borrowPart
        collateralShare
        assetFraction
        pair {
          id
          type
          name
          symbol

          supplyAPR
          borrowAPR
          utilization

          asset {
            ...erc20Fields
          }

          collateral {
            ...erc20Fields
          }
        }
      }

      tokens(where: { share_gt: 0 }) {
        share
        token {
          ...erc20Fields
        }
      }
    }
  }
`;
