export const ProtocolsConfig = {
  trisolaris: {
    chainCode: 18,
    singleStakingToken: [],
    chefs: [
      {
        address: '0x1f1Ed214bef5E83D8f5d0eB5D7011EB965D0D79B', // MasterChef V1 Staking Contract
        lpAddressFetcher: 'poolInfo',
        features: {
          pools: {
            fields: {
              totalSupply: 'totalSupplyGroupDefault',
              getReserves: 'getReservesGroupDefault',
            },
            processor: 'poolsFeatureProcessor',
          },
          staking: {
            fields: {
              //TODO define list of required fields + group mappings
            },
            processor: 'stakingFeatureProcessor', //TODO create this processor
          },
        },
      },
    ],
  },
};
