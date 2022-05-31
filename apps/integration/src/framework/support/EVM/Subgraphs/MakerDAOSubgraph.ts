import { Address } from '@app/common';
import { gql } from '@app/common/utils';

export const endpoints = {
  eth: 'https://api.thegraph.com/subgraphs/name/messari/makerdao-ethereum',
};

/**
 * @notice only fake/dead/empty/misconfigured pools are marked as isActive: false
 * @notice if outputTokenSupply is 0, that means no one has ever borrowed... do we still need this
 */
export const PoolsQuery = gql`
  {
    pools: markets(where: { isActive: true }, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      name
      maximumLTV # Maximum LTV
      # liquidationThreshold # Liquidation Threshold
      # totalValueLockedUSD # TVL
      totalSupplied: inputTokenBalance # total deposited
      totalBorrowed: outputTokenSupply # total borrowed
      supply: inputToken {
        address: id
      }
      borrow: outputToken {
        address: id
      }
      rates(first: 1) {
        rate
        side
        type
      }
    }
  }
`;

export interface PoolInterface {
  id: Address;
  name: string;
  maximumLTV: string;
  totalSupplied: string;
  totalBorrowed: string;
  supply: {
    address: Address;
  };
  borrow: {
    address: Address;
  };
  rates: {
    rate: string;
    side: 'BORROWER';
    type: 'STABLE';
  }[];
}

export interface PoolsQueryInterface {
  pools: PoolInterface[];
}

interface GraphQLSuccessResponse<TResponse> {
  data: TResponse;
}

interface GraphQLFailResponse {
  errors: {
    locations: { column: number; line: number }[];
    message: string;
  };
}

export type GraphQLResponse<TResponse> = GraphQLSuccessResponse<TResponse> | GraphQLFailResponse;
