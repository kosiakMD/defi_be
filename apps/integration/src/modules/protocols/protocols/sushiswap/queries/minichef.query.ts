import { gql } from '@app/common/utils/graphql';

import { poolFields } from './fragments/pool.fragment';
import { userFields } from './fragments/user.fragment';

export const getMiniChefPositionsQuery = gql`
  ${userFields}
  ${poolFields}
  query getMiniChefPositions($addresses: [String]) {
    users(where: { address_in: $addresses, pool_not: null, amount_not: 0 }) {
      ...userFields
      pool {
        ...poolFields
      }
    }
    miniChefs(first: 1) {
      id
    }
  }
`;
