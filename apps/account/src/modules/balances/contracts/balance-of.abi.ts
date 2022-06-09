import { AbiItem } from 'web3-utils';

export const BALANCE_OF_ABI: AbiItem = {
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