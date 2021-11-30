import { gql } from '@app/common/utils/graphql';

const basicTokenFields = `
fragment basicTokenFields on Token {
    id
    decimals
}`;

export const GetVaults = gql`
  ${basicTokenFields}
  {
    vaults {
      token {
        ...basicTokenFields
      }
      shareToken {
        ...basicTokenFields
      }
    }
  }
`;
