import { gql } from '@app/common/utils';

export const SubgraphQueries = {
  liquidityPositions: gql`
    query liquidityPositions($address: String!) {
      liquidityPositions(where: { user: $address, liquidityTokenBalance_gt: 0 }) {
        user {
          id
        }
        pair {
          id
          token0Price
          token1Price
          token0 {
            id
            decimals
          }
          token0 {
            id
            decimals
          }
          reserve0
          reserve1
        }
        liquidityTokenBalance
      }
    }
  `,
};
