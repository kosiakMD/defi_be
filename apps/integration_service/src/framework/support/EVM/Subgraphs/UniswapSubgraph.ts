import { gql } from '@app/common/utils';

export const POOLS_QUERY = gql`
  {
    pairs(orderBy: reserveUSD, orderDirection: desc, first: 1000, where: { reserveUSD_gt: 25000 }) {
      address: id
      token0 {
        address: id
      }
      token1 {
        address: id
      }
    }
  }
`;

export const POOLS_DATA_QUERY = gql`
  query ($pairs: [String!]!) {
    pairs(where: { id_in: $pairs }) {
      address: id
      reserve0
      reserve1
      totalSupply
      token0 {
        address: id
      }
      token1 {
        address: id
      }
    }
  }
`;

export const BALANCES_QUERY = gql`
  query ($addresses: [String!]!) {
    balances: liquidityPositions(
      first: 1000
      where: { user_in: $addresses, liquidityTokenBalance_gt: 0 }
    ) {
      id
      balance: liquidityTokenBalance
    }
  }
`;

export interface IUniswapBalanceSubgraphResponse {
  data: {
    balances: {
      id: string;
      balance: string;
    }[];
  };
}
