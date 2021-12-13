import { gql } from '@app/common/utils';

export const erc20FieldsLiteral = `id name symbol decimals`;
const commonErc20Field = (on = 'Token') => gql`
fragment erc20Fields on ${on} {
  id
  name
  symbol
  decimals
}
`;

// TODO: Is there a better way to share fragments fields across multiple graphQL Types?
export const erc20Fields = commonErc20Field('Token');
export const barFields = commonErc20Field('Bar');
