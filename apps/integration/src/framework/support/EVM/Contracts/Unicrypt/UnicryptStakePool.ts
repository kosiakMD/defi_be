import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class UnicryptStakePool extends MultiCallAbiProxy {
  static readonly getPoolInfo: AbiItem = {
    inputs: [],
    name: 'getPoolInfo',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'num_stakers',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'num_reward_pools',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'max_reward_subscriptions',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'share_weight_total',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'reward_creator',
            type: 'address',
          },
          {
            internalType: 'address',
            name: 'oracle_address',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'source_token_decimals',
            type: 'uint256',
          },
        ],
        internalType: 'structStakePool.PoolInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly getUserInfo: AbiItem = {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'getUserInfo',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'user_address',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'share_weight',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'time_boost_percentage',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'uncl_boost_percentage',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'subscriptions_length',
            type: 'uint256',
          },
        ],
        internalType: 'structIStakePool.UserInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };
}
