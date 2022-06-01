import { ChainAbbrEnum, ChainNameEnum, FeatureEnum } from '@app/common';

import { IUserEntryResponse } from '../../src/framework/support/interfaces/responses.interface';

// this data should match v2 mock response data for same request, please update both
export const v3mockResponseData: IUserEntryResponse = {
  errors: [],
  data: {
    protocol: {
      name: 'Solend',
      slug: 'something',
      features: [
        {
          chain: {
            id: 12,
            name: ChainNameEnum.sol,
            abbr: ChainAbbrEnum.sol,
          },
          list: [FeatureEnum.lending as any],
        },
      ],
      links: {
        url: 'https://solend.fi',
        logo: 'https://icons.llama.fi/solend.png',
        twitter: 'solendprotocol',
      },
    },
    wallets: [
      {
        address: '3eX8d6SKEqQRPcjpNc3xrbrWKjGzvVkmXbP1JS6ioFEk',
        total: 0.12774089216279544,
        chains: [
          {
            positions: {
              lending: [
                {
                  id: 'solend-lending',
                  chain: 12,
                  feature: FeatureEnum.lending,
                  borrowed: [
                    {
                      apy: {
                        variableApy: 181.0388856020871,
                      },
                      tvl: 3742153.40612916,
                      token: {
                        address: 'SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp',
                        name: 'Solend',
                        symbol: 'SLND',
                        decimals: 6,
                        reserve: 99999999.965269,
                        totalSupply: 99999999.965269,
                        price: 1.089,
                      },
                      amount: 0.023402722275253186,
                      value: 0.02548556455775072,
                    },
                    {
                      apy: {
                        variableApy: 7.126004467692937,
                      },
                      tvl: 184543995.0194722,
                      token: {
                        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                        name: 'USD Coin',
                        symbol: 'USDC',
                        decimals: 6,
                        reserve: 4784999996.239758,
                        totalSupply: 4784999996.239758,
                        price: 1.004,
                      },
                      amount: 0.00010207450144805246,
                      value: 0.00010248279945384468,
                    },
                  ],
                  rewarded: [],
                  supplied: [
                    {
                      apy: {
                        variableApy: 0.9059474194442307,
                      },
                      token: {
                        address: 'So11111111111111111111111111111111111111112',
                        name: 'Wrapped SOL',
                        symbol: 'SOL',
                        decimals: 9,
                        reserve: 0,
                        totalSupply: 0,
                        price: 56.12,
                      },
                      amount: 0.001517139,
                      value: 0.08514184068,
                      totalSupplied: 5926455.936799375,
                      tvl: 332592729.0412066,
                      totalSupply: 0,
                    },
                    {
                      apy: {
                        variableApy: 2.0628888332819395,
                      },
                      token: {
                        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
                        name: 'Tether',
                        symbol: 'USDT',
                        decimals: 6,
                        reserve: 1890000005.983848,
                        totalSupply: 1890000005.983848,
                        price: 1.001,
                      },
                      amount: 0.000961,
                      value: 0.000961961,
                      totalSupplied: 84005223.456071,
                      tvl: 84126225.4170358,
                      totalSupply: 1890000005.983848,
                    },
                  ],
                  debtRatio: 2.8602507415398044,
                },
                {
                  id: 'solend-lending',
                  chain: 12,
                  feature: FeatureEnum.lending,
                  borrowed: [],
                  rewarded: [],
                  supplied: [
                    {
                      apy: {
                        variableApy: 0.9362870298311954,
                      },
                      token: {
                        address: 'So11111111111111111111111111111111111111112',
                        name: 'Wrapped SOL',
                        symbol: 'SOL',
                        decimals: 9,
                        reserve: 0,
                        totalSupply: 0,
                        price: 56.12,
                      },
                      amount: 0.001197882,
                      value: 0.06722513784,
                      totalSupplied: 7734.089193447,
                      tvl: 434037.08553624566,
                      totalSupply: 0,
                    },
                  ],
                  debtRatio: 0.063863880948,
                },
              ],
              staking: [
                {
                  feature: FeatureEnum.staking,
                  id: '0xd4bbc80b9b102b77b21a06cb77e954049605e6c1::11',
                  chain: 2,
                  links: {},
                  token: null,
                  supplied: [
                    {
                      token: {
                        address: '0xf3bc6fc080ffcc30d93df48bfa2aa14b869554bb',
                        name: 'Pancake LPs',
                        symbol: 'Cake-LP',
                        decimals: 18,
                        price: 30.16607746761146,
                        underlying: [
                          {
                            address: '0xe0e514c71282b6f4e823703a39374cf58dc3ea4f',
                            name: 'BELT Token',
                            symbol: 'BELT',
                            decimals: 18,
                            price: 0.7167314704417656,
                            position: 1,
                            reserve: 4702915.80240798,
                            balance: 0.033061713037751975,
                            value: 0.023696370200871664,
                          },
                          {
                            address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
                            name: 'Wrapped BNB',
                            symbol: 'WBNB',
                            decimals: 18,
                            price: 305.23645209984835,
                            position: 0,
                            reserve: 11043.09104538636,
                            balance: 0.00007763343477367649,
                            value: 0.023696554194642006,
                          },
                        ],
                      },
                      totalSupply: 223478.89600731753,
                      tvl: 0,
                      amount: 0.001571066853037099,
                      value: 0.04739292439551367,
                    },
                  ],
                  rewarded: [
                    {
                      token: {
                        address: '0xe0e514c71282b6f4e823703a39374cf58dc3ea4f',
                        name: 'BELT Token',
                        symbol: 'BELT',
                        decimals: 18,
                        price: 0.7167314704417656,
                      },
                      harvests: {
                        day: 5040,
                        week: 35280,
                        month: 153300,
                        year: 1839600,
                      },
                      apr: {
                        day: 0.0011982443284303992,
                        week: 0.008387710299012795,
                        month: 0.036446598323091314,
                        year: 0.4373591798770957,
                      },
                      apy: {
                        day: 0.0011982443284303992,
                        week: 0.008387710299012795,
                        month: 0.036446598323091314,
                        year: 0.4373591798770957,
                      },
                      amount: 0.000258654705477868,
                      value: 0.0001853859673938341,
                    },
                  ],
                },
              ],
            },
            features: [FeatureEnum.lending as any, FeatureEnum.staking as any],
            total: 0.12774089216279544,
            chain: {
              id: 12,
              name: ChainNameEnum.sol,
              abbr: ChainAbbrEnum.sol,
            },
          },
        ],
      },
    ],
    total: 0.12774089216279544,
  },
};
