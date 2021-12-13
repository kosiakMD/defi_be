import { gql } from '@app/common/utils';

export const barFields = gql`
  fragment barFields on Bar {
    id
    name
    symbol
    totalSupply
    decimals
    ratio
    sushi
  }
`;
