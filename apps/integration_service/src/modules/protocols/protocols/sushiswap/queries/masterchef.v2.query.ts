import { gql } from '@app/common/utils/graphql';

import { poolFields } from './fragments/pool.fragment';
import { userFields } from './fragments/user.fragment';

export const getMasterChefV2PositionsQuery = gql`
  ${userFields}
  ${poolFields}
  query getMasterChefPositions($addresses: [String]) {
    users(where: { address_in: $addresses, pool_not: null, amount_not: 0 }) {
      ...userFields
      pool {
        ...poolFields
        rewarder {
          id
          rewardToken
        }
      }
    }
    masterChefs(first: 1) {
      id
    }
  }
`;
