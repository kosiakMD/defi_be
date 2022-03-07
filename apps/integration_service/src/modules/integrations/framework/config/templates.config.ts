export const TemplatesConfig = {
  pools: {
    fields: {
      totalSupply: 'totalSupplyGroupDefault',
      getReserves: 'getReservesGroupDefault',
    },
    processor: 'poolsFeatureProcessor',
  },
  farming: {
    fields: {
      totalSupply: 'totalSupplyGroupDefault',
      getReserves: 'getReservesGroupDefault',
      balanceOf: 'balanceOfGroupDefault',
      totalAllocPoint: 'totalAllocPointGroupDefault',
      rewardPerBlock: 'rewardPerBlockGroupDefault',
      allocPoint: 'allocPointGroupDefault',
    },
    processor: 'farmingFeatureProcessor',
  },
  'interactive:subgraph': {
    fields: {
      balance: 'subgraphBalanceGroupDefault',
    },
  },
};
