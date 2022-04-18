import { gql } from '@app/common/utils';

export const POOL_QUERY = gql`
  {
    pools(first: 1000, where: { totalShares_gt: 1000 }) {
      id
      address
      swapFee
      name
      totalShares
      tokens {
        address
        balance
        decimals
        name
        symbol
        weight
      }
    }
  }
`;

export const USERS_POOL_SHARES = gql`
  query ($addresses: [String!]!) {
    users(where: { id_in: $addresses }) {
      id
      sharesOwned(where: { balance_gt: 0 }) {
        balance
        poolId {
          address
          totalShares
          name
        }
      }
    }
  }
`;

export const USERS_YIELDS = gql`
  query ($addresses: [String!]!) {
    users(where: { id_in: $addresses }) {
      id
      gaugeShares(where: { balance_gt: 0 }) {
        gauge {
          poolAddress
        }
        balance
      }
    }
  }
`;

export interface Token {
  address: string;
  balance: string;
  decimals: number;
  name: string;
  symbol: string;
  weight: string;
}

export interface Pool {
  id: string;
  address: string;
  strategyType: number;
  swapFee: string;
  name: string;
  totalShares: string;
  tokens: Token[];
}

export interface IBalancerPoolsResponce {
  data: {
    pools: Pool[];
  };
}

export interface IBalancerUserResponce {
  data: {
    users: {
      id: string;
      sharesOwned: {
        poolId: {
          address: string;
        };
        balance: string;
      }[];
    }[];
  };
}

export interface IBalancerUsersYieldsResponce {
  data: {
    users: {
      id: string;
      gaugeShares: {
        gauge: {
          poolAddress: string;
        };
        balance: string;
      }[];
    }[];
  };
}
