import { AbiItem } from 'web3-utils';

export class Abis {
  static readonly address: '0x690af18466607997c247B539381ed87c1cC78a0C';
  static readonly pendingkins: AbiItem = {
      inputs: [
        { internalType: 'uint256', name: '_pid', type: 'uint256' },
        { internalType: 'address', name: '_user', type: 'address' },
      ],
      name: 'pendingkins',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
  };
  static readonly userInfo: AbiItem = {
    inputs: [{
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }, {
      "internalType": "address",
      "name": "",
      "type": "address"
    }],
    name: 'userInfo',
    outputs: [{
      "internalType": "uint256",
      "name": "amount",
      "type": "uint256"
    }, {
      "internalType": "uint256",
      "name": "rewardDebt",
      "type": "uint256"
    }, {
      "internalType": "uint256",
      "name": "depositTime",
      "type": "uint256"
    }, {
      "internalType": "uint256",
      "name": "depVal",
      "type": "uint256"
    }],
    stateMutability: 'view',
    type: 'function',
  };
}
