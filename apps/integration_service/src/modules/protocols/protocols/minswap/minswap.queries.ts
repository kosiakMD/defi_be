import { gql } from '@app/common/utils/graphql';

export const FARMS_BY_ADDRESS_QUERY = gql`
  query FarmPoolInfo($address: String!) {
    farmPoolInfo(address: $address) {
      lpAsset {
        currencySymbol
        tokenName
      }
      liquidityStaking
      pendingReward
      baseAPR
    }
  }
`;
