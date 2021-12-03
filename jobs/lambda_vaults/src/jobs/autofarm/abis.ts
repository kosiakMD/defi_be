import { AbiItem } from 'web3-utils';

export class Abis {
  static readonly getReserves: AbiItem = {
    constant: true,
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
      { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
      { internalType: 'uint32', name: '_blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly balanceOf: AbiItem = {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly poolInfo: AbiItem = {
    inputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { type: 'address', name: 'want', internalType: 'contract IERC20' },
      { type: 'uint256', name: 'allocPoint', internalType: 'uint256' },
      { type: 'uint256', name: 'lastRewardBlock', internalType: 'uint256' },
      { type: 'uint256', name: 'accAUTOPerShare', internalType: 'uint256' },
      { internalType: 'address', name: 'strat', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly poolInfoV2: AbiItem = {
    inputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { type: 'address', name: 'want', internalType: 'contract IERC20' },
      { type: 'uint256', name: 'allocPoint', internalType: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly totalSupply: AbiItem = {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly totalAllocPoint: AbiItem = {
    inputs: [],
    name: 'totalAllocPoint',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  };
  static readonly poolLength: AbiItem = {
    inputs: [],
    name: "poolLength",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly balance: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'uint256',
        name: '',
        internalType: 'uint256',
      },
    ],
    name: 'balance',
    inputs: [],
  };
  static readonly rewardToken: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'address',
        name: '',
        internalType: 'contract IERC20',
      },
    ],
    name: 'rewardToken',
    inputs: [],
  };
  static readonly tokenPerSec: AbiItem = {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      {
        type: 'uint256',
        name: '',
        internalType: 'uint256',
      },
    ],
    name: 'tokenPerSec',
    inputs: [],
  };
  static readonly AUTOPerBlock: AbiItem = {
    inputs: [],
    name: "AUTOPerBlock",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly wantLockedTotal: AbiItem = {
    inputs: [],
    name: "wantLockedTotal",
    outputs:[
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly sharesTotal: AbiItem = {
    inputs: [],
    name: "sharesTotal",
    outputs:[
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly alpacaPerBlock: AbiItem = {
    inputs: [],
    name: "alpacaPerBlock",
    outputs: [
      {
        internalType:"uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly cakePerBlock: AbiItem = {
    inputs: [],
    name: "cakePerBlock",
    outputs:[
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly beltPerBlock: AbiItem = {
    inputs: [],
    name: "BELTPerBlock",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly mdxPerBlock: AbiItem = {
    inputs: [],
    name: "mdxPerBlock",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly xmsPerBlock: AbiItem = {
    inputs: [],
    name: "xmsPerBlock",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly pid: AbiItem = {
    inputs: [],
    name: "pid",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly farmContractAddress: AbiItem = {
    inputs: [],
    name: "farmContractAddress",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly token0Address: AbiItem = {
    inputs: [
      
    ],
    name: "token0Address",
    outputs:[
      {
        internalType:"address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
  static readonly token1Address: AbiItem = {
    inputs: [
      
    ],
    name: "token1Address",
    outputs:[
      {
        internalType:"address",
        name: "",
        type: "address"
      }
    ],
    stateMutability: "view",
    type: "function"
  };
}