export const ProtocolsConfig = {
  trisolaris: {
    chainCode: 18,
    chefs: [
      {
        address: '0x1f1Ed214bef5E83D8f5d0eB5D7011EB965D0D79B', // MasterChef V1 Staking Contract
        features: ['pools', 'staking'],
        lpAddressFetcher: 'poolInfo',
        fields: {
          totalSupply: 'totalSupplyGroupDefault',
          getReserves: 'getReservesGroupDefault',
        },
      },
    ],
  },
};
