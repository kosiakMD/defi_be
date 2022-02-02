import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class GaugeAbi extends MultiCallAbiProxy {
  static readonly lpToken: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'lp_token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  };

  static readonly balanceOf: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  };

  static readonly minter = {
    name: 'minter',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly rewardTokens: AbiItem = {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_tokens',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  };
}

export const GaugeAbis = [
  {
    stateMutability: 'view',
    type: 'function',
    name: 'lp_token',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    stateMutability: 'view',
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'minter',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  },
];

export const GaugeRewardAbi = [
  {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_tokens',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'rewarded_token',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'claimed_rewards_for',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    name: 'claimable_tokens',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'addr' }],
    stateMutability: 'view',
    type: 'function',
    constant: true,
    signature: '0x33134583',
  },
  {
    name: 'claimable_reward',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [
      { type: 'address', name: '_addr' },
      { type: 'address', name: '_token' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];
