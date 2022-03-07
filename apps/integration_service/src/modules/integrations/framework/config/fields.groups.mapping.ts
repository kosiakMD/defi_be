export const FieldsGroupsMapping = {
  totalSupply: {
    totalSupplyGroupDefault: {
      call: 'totalSupply',
      path: 'output.data',
    },
  },
  getReserves: {
    getReservesGroupDefault: {
      call: 'getReserves',
      path: 'output.data',
    },
  },
  balanceOf: {
    balanceOfGroupDefault: {
      call: 'balanceOf',
      path: 'output.data',
    },
  },
  totalAllocPoint: {
    totalAllocPointGroupDefault: {
      call: 'totalAllocPoint',
      path: 'output.data',
    },
  },
  rewardPerBlock: {
    rewardPerBlockGroupDefault: {
      call: 'rewardPerBlock',
      path: 'output.data',
    },
  },
  allocPoint: {
    allocPointGroupDefault: {
      call: 'poolInfo',
      path: 'output.data.allocPoint',
    },
  },
  balance: {
    subgraphBalanceGroupDefault: {
      type: 'subgraph',
      call: 'liquidityPositions',
      path: 'liquidityPositions[].liquidityTokenBalance',
    },
  },
};
