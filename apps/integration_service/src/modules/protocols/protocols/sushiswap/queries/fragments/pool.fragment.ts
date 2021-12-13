import { gql } from '@app/common/utils';

export const poolFields = gql`
  fragment poolFields on Pool {
    id
    pair
  }
`;
