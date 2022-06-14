import { gql } from '@app/common/utils';

export const userFields = gql`
  fragment userFields on User {
    id
    amount
  }
`;
