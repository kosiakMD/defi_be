export enum ContractVars {
  poolLength = 'poolLength',
  stakingToken = 'stakingToken',
  rewardToken = 'rewardToken',
  totalAllocationPoints = 'totalAllocationPoints',
  poolAllocationPoints = 'poolAllocationPoints',
  userBalance = 'userBalance',
}

export enum FeatureCode {
  chiefVault = 'chiefvault',
  singleChief = 'chiefVault',
}

export interface CallGroup {
  call;
  args;
  path;
}

export const ChiefGroupsMapping = {
  poolLength: {
    poolLengthGroupDefault: {
      call: 'poolLength',
      path: 'output.data',
    },
  },
  stakingToken: {
    poolInfoGroupDefault: {
      call: 'poolInfo',
      args: ['$POOL_ID'],
      path: 'output.data.lpToken',
    },
  },
  rewardToken: {
    poolInfoGroupDefault: {
      call: 'tri',
      path: 'output.data',
    },
    poolInfoGroupPancake: {
      call: 'cake',
      path: 'output.data',
    },
  },
  totalAllocationPoints: {
    poolInfoGroupDefault: {
      call: 'totalAllocPoint',
      path: 'output.data',
    },
  },
  poolAllocationPoints: {
    poolInfoGroupDefault: {
      call: 'poolInfo',
      args: ['$poolId'],
      path: 'output.data.allocPoint',
    },
  },
  userBalance: {
    poolInfoGroupDefault: {
      call: 'userInfo',
      args: ['$poolId', '$accountAddress'],
      path: 'output.data.amount',
    },
  },
};

export interface PoolData {
  uniqueId: string,
  poolId: string;
  poolAddress: string,
  featureCode: string,
  stakingToken: {
    address: string,
  }
  rewards: {
    address: string
  }[]
}
