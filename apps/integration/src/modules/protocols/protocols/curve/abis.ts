import { AbiItem } from 'web3-utils';

import { MultiCallAbiProxy } from '@app/common/web3provider/multicall.abi.proxy';

export class Abis extends MultiCallAbiProxy {
  static readonly balanceOf: AbiItem = {
    name: 'balanceOf',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
  };

  static readonly claimableRewardAdditional: AbiItem = {
    name: 'claimable_reward',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [
      { type: 'address', name: '_addr' },
      { type: 'address', name: '_token' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly claimableTokens: AbiItem = {
    name: 'claimable_tokens',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'addr' }],
    stateMutability: 'view',
    type: 'function',
    constant: true,
    // signature: '0x33134583',
  };
  static readonly claimableReward: AbiItem = {
    name: 'claimable_reward',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'addr' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly claimedRewardFor: AbiItem = {
    name: 'claimed_rewards_for',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly claimableRewardWrite: AbiItem = {
    stateMutability: 'nonpayable',
    type: 'function',
    name: 'claimable_reward_write',
    inputs: [
      { name: '_addr', type: 'address' },
      { name: '_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  };
}

export const CurveAbis = [
  {
    name: 'balanceOf',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
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
  {
    name: 'claimable_tokens',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'addr' }],
    stateMutability: 'view',
    type: 'function',
    constant: true,
    // signature: '0x33134583',
  },
  {
    name: 'claimable_reward',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'addr' }],
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
];

export const GaugeAbi = [
  {
    name: 'balanceOf',
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
    // signature: '0x33134583',
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

export const GaugeRewardAbi = [
  {
    name: 'claimable_reward',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'addr' }],
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
];
