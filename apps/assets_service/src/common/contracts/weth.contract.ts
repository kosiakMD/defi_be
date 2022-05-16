import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum } from '@app/common';
import { CHAIN_ID_ETH } from '@app/common/constant';
import { ERC20Token } from '@app/common/interfaces';

import { MetadataService } from '../services/metadata/metadata.service';

interface ERC20TokenLocal extends ERC20Token {
  chainId: typeof CHAIN_ID_ETH;
}

// events: https://web3js.readthedocs.io/en/v1.2.11/web3-eth-contract.html#events
@Injectable()
export class WETH {
  public static token: ERC20TokenLocal = {
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    chainId: CHAIN_ID_ETH,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    totalSupply: null,
  };

  private ETHProvider: Web3;
  private contract;
  private readonly address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
  private readonly abi = [
    {
      constant: true,
      inputs: [],
      name: 'name',
      outputs: [{ name: '', type: 'string' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: false,
      inputs: [
        { name: 'guy', type: 'address' },
        { name: 'wad', type: 'uint256' },
      ],
      name: 'approve',
      outputs: [{ name: '', type: 'bool' }],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'totalSupply',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: false,
      inputs: [
        { name: 'src', type: 'address' },
        { name: 'dst', type: 'address' },
        { name: 'wad', type: 'uint256' },
      ],
      name: 'transferFrom',
      outputs: [{ name: '', type: 'bool' }],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: false,
      inputs: [{ name: 'wad', type: 'uint256' }],
      name: 'withdraw',
      outputs: [],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'decimals',
      outputs: [{ name: '', type: 'uint8' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [{ name: '', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [],
      name: 'symbol',
      outputs: [{ name: '', type: 'string' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: false,
      inputs: [
        { name: 'dst', type: 'address' },
        { name: 'wad', type: 'uint256' },
      ],
      name: 'transfer',
      outputs: [{ name: '', type: 'bool' }],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      constant: false,
      inputs: [],
      name: 'deposit',
      outputs: [],
      payable: true,
      stateMutability: 'payable',
      type: 'function',
    },
    {
      constant: true,
      inputs: [
        { name: '', type: 'address' },
        { name: '', type: 'address' },
      ],
      name: 'allowance',
      outputs: [{ name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    { payable: true, stateMutability: 'payable', type: 'fallback' },
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'src', type: 'address' },
        { indexed: true, name: 'guy', type: 'address' },
        { indexed: false, name: 'wad', type: 'uint256' },
      ],
      name: 'Approval',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'src', type: 'address' },
        { indexed: true, name: 'dst', type: 'address' },
        { indexed: false, name: 'wad', type: 'uint256' },
      ],
      name: 'Transfer',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'dst', type: 'address' },
        { indexed: false, name: 'wad', type: 'uint256' },
      ],
      name: 'Deposit',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'src', type: 'address' },
        { indexed: false, name: 'wad', type: 'uint256' },
      ],
      name: 'Withdrawal',
      type: 'event',
    },
  ];

  constructor(private readonly chainProvider: MetadataService) {
    this.ETHProvider = this.chainProvider.getInstanceByChainId(ChainIdEnum.eth);
    this.contract = new this.ETHProvider.eth.Contract(this.abi as AbiItem[], this.address);
  }
}
