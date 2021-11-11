import { gql } from '@app/common/utils/graphql';

export const getMiniChefPositionsQuery = gql`
  query getMiniChefPositions($addresses: [String]) {
    users(where: { address_in: $addresses, pool_not: null, amount_not: 0 }) {
      id
      amount
      pool {
        id
        pair
      }
    }
    miniChefs(first: 1) {
      id
      sushi
    }
  }
`;
