import { gql } from '@app/common/utils';

export const getAssetsQuery = gql`
  query getAssets($offset: Int!, $limit: Int!) {
    getAssets(offset: $offset, limit: $limit) {
      assets {
        # Farm Details
        farm
        url
        stakingLink

        # Need to convert to internal chain
        blockchain

        # save both
        aprYearly
        apyYearly
        tvlStaked

        # Staked Asset
        asset
        assetId
        assetAddress

        # Underlying
        tokenA
        tokenAAddress
        tokenB
        tokenBAddress
        tokenC
        tokenCAddress
        tokenD
        tokenDAddress

        # Rewards
        rewardTokenA
        rewardTokenAAddress
        rewardTokenB
        rewardTokenBAddress
      }

      pageMeta {
        total
        page
        pages
      }
    }
  }
`;
