import { gql } from '@app/common/utils/graphql';

export const GetTokens = gql`
  {
    atokens {
      id
      underlyingAssetAddress
    }
    vtokens {
      id
      underlyingAssetAddress
    }
    stokens {
      id
      underlyingAssetAddress
    }
  }
`;
