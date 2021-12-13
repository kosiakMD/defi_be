import { gql } from '@app/common/utils/graphql';

import { pairFields } from './fragments/pair.fragment';

export const getPairsQuery = gql`
  ${pairFields}
  query getPairs($addresses: [String!]!) {
    pairs(where: { id_in: $addresses }) {
      ...pairFields
    }
  }
`;

export const getLiquidityPositionsQuery = gql`
  ${pairFields}
  query getLiquidityPositions($addresses: [String!]!) {
    users(where: { id_in: $addresses }) {
      liquidityPositions(where: { liquidityTokenBalance_gt: 0 }) {
        liquidityTokenBalance
        user {
          id
        }
        pair {
          ...pairFields
        }
      }
    }
  }
`;
