import { gql } from '@app/common/utils/graphql';

export const getCompoundAccountQuery = gql`
  query getCompoundAccountQuery($addresses: [String!]!) {
    accounts(where: { id_in: $addresses }) {
      id
      health
      tokens {
        id
        symbol
        cTokenBalance
        market {
          id
          borrowRate
          supplyRate
          reserves
          exchangeRate
          symbol
          totalSupply
          underlyingName
          underlyingPrice
          underlyingSymbol
          underlyingAddress
          underlyingDecimals
        }
      }
    }
  }
`;
