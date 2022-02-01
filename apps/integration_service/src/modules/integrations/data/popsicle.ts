export const vault = {
  id: 'ftm:0xbf513ace2abdc69d38ee847effdaa1901808c31c:0',
  apiVaultCalls: [
    {
      tvl: 'apitogettvl',
    },
  ],
  blockchainVaultCalls: [
    {
      // poolAllocPoints = poolInfo.outputs[1].allocPoint
      target: '0xbf513ace2abdc69d38ee847effdaa1901808c31c',
      args: ['0'],
      abi: {
        inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        name: 'balanceOf',
        outputs: [
          { internalType: 'contract IERC20', name: 'stakingToken', type: 'address' },
          { internalType: 'uint256', name: 'stakingTokenTotalAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'accIcePerShare', type: 'uint256' },
          { internalType: 'uint32', name: 'lastRewardTime', type: 'uint32' },
          { internalType: 'uint16', name: 'balanc', type: 'uint16' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
      handler: {
        name: 'tvl_pancake',
        //proxy: 'customConverter',
      },
    },
  ],
  blockchainAccountCalls: [
    {
      target: '0xbf513ace2abdc69d38ee847effdaa1901808c31c',
      args: ['0', '$ACCOUNT'],
      abi: {
        inputs: [
          { internalType: 'uint256', name: '', type: 'uint256' },
          { internalType: 'address', name: '', type: 'address' },
        ],
        name: 'userInfo',
        outputs: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'remainingIceTokenReward', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    },
  ],
  interactiveCalls: [
    {
      requirements: {
        // balanceOf of staking token
      },
      abi: {
        inputs: [
          { internalType: 'uint256', name: '_pid', type: 'uint256' },
          { internalType: 'uint256', name: '_amount', type: 'uint256' },
        ],
        name: 'deposit',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    },
  ],
};
