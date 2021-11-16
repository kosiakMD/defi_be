import { gql } from '@app/common/utils/graphql';

import { barFields } from '../fragments/bar.fragment';

export const getSushiBarPositionsQuery = gql`
  ${barFields}
  query getSushiBarPositions($addresses: [String]) {
    bars(first: 1) {
      ...barFields
    }
    users(where: { id_in: $addresses }) {
      id
      xSushi
    }
  }
`;
