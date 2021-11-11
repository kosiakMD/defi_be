import { gql } from '@app/common/utils/graphql';

export const getMasterChefPositionsQuery = gql`
  query getMasterChefPositions($addresses: [String]) {
    users(where: { address_in: $addresses, pool_not: null, amount_not: 0 }) {
      id
      amount
      pool {
        id
        pair
        accSushiPerShare
      }
    }
    masterChefs(first: 1) {
      id
      sushi
    }
  }
`;
