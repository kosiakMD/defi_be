import { gql } from '@app/common/utils';

export const POOLS_QUERY = gql`
  {
    pairs(orderBy: reserveUSD, orderDirection: desc, first: 1000, where: { reserveUSD_gt: 25000 }) {
      #pairs(first: 1, where: { reserveUSD_gt: 25000 }) {
      address: id
      reserve0
      reserve1
      totalSupply
      # reserveUSD
      token0 {
        address: id
        #   # name
        #   # symbol
        #   # decimals
      }
      token1 {
        address: id
        #   # name
        #   # symbol
        #   # decimals
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
