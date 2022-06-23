import { gql } from '@app/common/utils';

export const POOLS = gql`
  query GetLiquidityMiningList($account: Address) {
    getLiquidityMiningList(account: $account) {
      list {
        address
        apy
        contract
        name
        poolAddress
        stakedPercentage
        stakingBalance
      }
    }
  }
`;

export const LIQUIDITY_POSITION = gql`
  query GetLiquidityMiningPanel($contract: String!, $address: Address!, $account: Address) {
    getLiquidityMiningPanel(contract: $contract, address: $address, account: $account) {
      commonData {
        apy
        totalStakedLT
        stakingToken {
          address
          name
          symbol
          decimals
          totalSupply
        }
      }
      accountData {
        rewardTokenBalance
        rewardsAvailable
        rewardsClaimed
        rewardsTotal
        stakedPercentage
        stakingBalance
        stakingRank
        totalBalance
        walletBalance
      }
      id
    }
  }
`;

export interface IPool {
  address: string;
  apy: string;
  contract: string;
  name: string;
  poolAddress: string;
  stakedPercentage: string;
  stakingBalance: string;
}

export interface IPoolsResponse {
  data: {
    getLiquidityMiningList: {
      list: IPool[];
    };
  };
}

export interface IExtendedPool {
  commonData: {
    apy: string;
    totalStakedLT: string;
    stakingToken: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      totalSupply: string;
    };
  };
  accountData: {
    rewardTokenBalance: string;
    rewardsAvailable: string;
    rewardsClaimed: string;
    rewardsTotal: string;
    stakedPercentage: string;
    stakingBalance: string;
    stakingRank: string;
    totalBalance: string;
    walletBalance: string;
  };
  id: string;
}

export interface ILiquidityPositionResponse {
  data: {
    getLiquidityMiningPanel: IExtendedPool;
  };
}

/**
 * @param account wallet address
 * @param address farm address
 * @param contract Milkomeda_Staking_v1
 */
export interface ILiquidityPositionVariables {
  account: string;
  address: string;
  contract: string;
}
