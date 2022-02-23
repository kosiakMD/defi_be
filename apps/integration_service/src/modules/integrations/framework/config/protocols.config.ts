export const ProtocolsConfig = {
  trisolaris: {
    chainCode: 18,
    contracts: [
      {
        type: 'MASTER_CHEF',
        address: '0x1f1Ed214bef5E83D8f5d0eB5D7011EB965D0D79B', // MasterChef V1 Staking Contract
        lpAddressFetcher: 'poolInfo',
        features: {
          _pools: {
            template: 'pools',
          },
          _farming: {
            template: 'farming',
          },
        },
      },
      {
        type: 'MASTER_CHEF',
        address: '0x3838956710bcc9D122Dd23863a0549ca8D5675D6', // MasterChef V2 Staking Contract
        lpAddressFetcher: 'lpToken',
        features: {
          _pools: {
            template: 'pools',
          },
          _farming: {
            template: 'farming',
          },
        },
      },
    ],
  },
  pancake: {
    chainCode: 2,
    contracts: [
      {
        type: 'MASTER_CHEF',
        address: '0x73feaa1ee314f8c655e354234017be2193c9e24e',
        features: {
          farming: {
            template: 'farming',
          },
        },
      },
    ],
  },
};
