import { AbiItem } from 'web3-utils';
export const BALANCES_ABI: { [key: string]: AbiItem } = {
  getBalances: {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address[]',
        name: 'addresses',
        type: 'address[]',
      },
    ],
    name: 'getBalances',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  balanceOf: {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  }
};

// export const BALANCES_ABI: AbiItem[] = [
//   {
//     inputs: [
//       {
//         internalType: 'address',
//         name: 'owner',
//         type: 'address',
//       },
//       {
//         internalType: 'address[]',
//         name: 'addresses',
//         type: 'address[]',
//       },
//     ],
//     name: 'getBalances',
//     outputs: [
//       {
//         internalType: 'uint256[]',
//         name: '',
//         type: 'uint256[]',
//       },
//     ],
//     stateMutability: 'view',
//     type: 'function',
//   },
//   {
//     constant: true,
//     inputs: [
//       {
//         name: '_owner',
//         type: 'address',
//       },
//     ],
//     name: 'balanceOf',
//     outputs: [
//       {
//         name: 'balance',
//         type: 'uint256',
//       },
//     ],
//     payable: false,
//     stateMutability: 'view',
//     type: 'function',
//   }
// ];
