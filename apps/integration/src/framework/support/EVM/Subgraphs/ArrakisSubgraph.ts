import { gql } from '@app/common/utils';

export interface ArrakisPool {
  id: string;
  token0: { address: string };
  token1: { address: string };
  liquidity: number;
  uniswapPool: string;
  totalSupply: string;
  lowerTick: string;
  upperTick: string;
  lastTouchWithoutFees: string;
  supplySnapshots: {
    id: string;
    block: number;
    reserves0: number;
    reserves1: number;
  }[];
  feeSnapshots: {
    id?: string;
    block: string;
    feesEarned0: string;
    feesEarned1: string;
  }[];
  latestInfo: {
    sqrtPriceX96: string;
    reserves0: string;
    reserves1: string;
    leftover0: string;
    leftover1: string;
    unclaimedFees0: string;
    unclaimedFees1: string;
    block: number;
  };
  gaugeAddress?: string;
  rewardTokenAddress?: string;
  rewardPerSecond?: string;
}
export const ARRAKIS_POOLS_QUERY = gql`
  {
    pools {
      id
      blockCreated
      manager
      address
      uniswapPool
      token0 {
        address
        name
        symbol
      }
      token1 {
        address
        name
        symbol
      }
      feeTier
      liquidity
      lowerTick
      upperTick
      totalSupply
      positionId
      lastTouchWithoutFees
      supplySnapshots {
        id
        block
        reserves0
        reserves1
      }
      feeSnapshots {
        id
        block
        feesEarned0
        feesEarned1
      }
      latestInfo {
        sqrtPriceX96
        reserves0
        reserves1
        leftover0
        leftover1
        unclaimedFees0
        unclaimedFees1
        block
      }
    }
  }
`;