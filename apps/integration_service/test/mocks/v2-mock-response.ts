import { IntegrationsResponseV2Dto } from 'apps/integration_service/src/modules/integrations/dto/integrations.dto';

import {
  ChainAbbrEnum,
  ChainNameEnum,
  FeatureEnum,
  ProjectEnum,
  SolendProtocolEnum,
} from '@app/common';

// this data should match v3 mock response data for same request, please update both
export const v2mockResponseData: IntegrationsResponseV2Dto = {
  errors: [],
  data: {
    protocol: {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      name: SolendProtocolEnum.solend,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      project: ProjectEnum.solend,
      label: 'Solend',
      chains: [ChainAbbrEnum.sol],
    },
    wallets: [
      {
        chains: [
          {
            chain: {
              id: 12,
              name: ChainNameEnum.sol,
              abbr: ChainAbbrEnum.sol,
            },
            features: [
              FeatureEnum.lending,
              FeatureEnum.claimable,
              FeatureEnum.borrowing,
              FeatureEnum.health,
              FeatureEnum.staking,
            ],
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            [FeatureEnum.lending]: {
              totalValue: 0.15332893951999998,
              items: [
                {
                  address: 'So11111111111111111111111111111111111111112',
                  balance: 0.001517139,
                  value: 0.08514184068,
                  apy: 0.9059474194442307,
                  token: {
                    address: 'So11111111111111111111111111111111111111112',
                    name: 'Wrapped SOL',
                    symbol: 'SOL',
                    decimals: 9,
                    reserve: 0,
                    totalSupply: 0,
                    price: 56.12,
                  },
                },
                {
                  address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
                  balance: 0.000961,
                  value: 0.000961961,
                  apy: 2.0628888332819395,
                  token: {
                    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
                    name: 'Tether',
                    symbol: 'USDT',
                    decimals: 6,
                    reserve: 1890000005.983848,
                    totalSupply: 1890000005.983848,
                    price: 1.001,
                  },
                },
                {
                  address: 'So11111111111111111111111111111111111111112',
                  balance: 0.001197882,
                  value: 0.06722513784,
                  apy: 0.9362870298311954,
                  token: {
                    address: 'So11111111111111111111111111111111111111112',
                    name: 'Wrapped SOL',
                    symbol: 'SOL',
                    decimals: 9,
                    reserve: 0,
                    totalSupply: 0,
                    price: 56.12,
                  },
                },
              ],
            },
            borrowing: {
              totalValue: 0.025588047357204564,
              items: [
                {
                  address: 'SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp',
                  balance: 0.023402722275253186,
                  value: 0.02548556455775072,
                  apy: 181.0388856020871,
                  token: {
                    address: 'SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp',
                    name: 'Solend',
                    symbol: 'SLND',
                    decimals: 6,
                    reserve: 99999999.965269,
                    totalSupply: 99999999.965269,
                    price: 1.089,
                  },
                },
                {
                  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                  balance: 0.00010207450144805246,
                  value: 0.00010248279945384468,
                  apy: 7.126004467692937,
                  token: {
                    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    name: 'USD Coin',
                    symbol: 'USDC',
                    decimals: 6,
                    reserve: 4784999996.239758,
                    totalSupply: 4784999996.239758,
                    price: 1.004,
                  },
                },
              ],
            },
            staking: {
              totalValue: 0.0475783244825175,
              items: [
                {
                  address: '0xd4bbc80b9b102b77b21a06cb77e954049605e6c1',
                  poolId: 11,
                  poolName: null,
                  staked: '0.001571066853037099',
                  stats: {
                    tvl: 0,
                    poolApy: null,
                  },
                  stakingToken: {
                    address: '0xf3bc6fc080ffcc30d93df48bfa2aa14b869554bb',
                    name: 'Pancake LPs',
                    symbol: 'Cake-LP',
                    decimals: 18,
                    totalSupply: null,
                    price: 30.16607746761146,
                    value: 0.04739292439551367,
                    balance: 0.001571066853037099,
                    tokens: [
                      {
                        address: '0xe0e514c71282b6f4e823703a39374cf58dc3ea4f',
                        name: 'BELT Token',
                        symbol: 'BELT',
                        decimals: 18,
                        reserve: 4702915.80240798,
                        value: 0.023696370200871664,
                        balance: 0.033061713037751975,
                        price: 0.7167314704417656,
                        positionInPool: 1,
                      },
                      {
                        address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                        name: 'Wrapped BNB',
                        symbol: 'WBNB',
                        decimals: 18,
                        reserve: 11043.09104538636,
                        value: 0.023696554194642006,
                        balance: 0.00007763343477367649,
                        price: 305.23645209984835,
                        positionInPool: 0,
                      },
                    ],
                  },
                  rewards: [
                    {
                      address: '0xe0e514c71282b6f4e823703a39374cf58dc3ea4f',
                      name: 'BELT Token',
                      symbol: 'BELT',
                      decimals: 18,
                      totalSupply: null,
                      price: 0.7167314704417656,
                      claimableData: {
                        balance: 0.000258674405477905,
                        value: 0.0001853859673938341,
                      },
                      apr: 43.717064627455066,
                    },
                  ],
                  extra: {},
                },
              ],
            },
            health: {
              totalValue: 0,
              items: [
                {
                  healthFactor: 2.8602507415398044,
                },
                {
                  healthFactor: 0.063863880948,
                },
              ],
            },
          },
        ],
        address: '3eX8d6SKEqQRPcjpNc3xrbrWKjGzvVkmXbP1JS6ioFEk',
      },
    ],
    total: 0.17531920252570293,
  },
};
