import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { Injectable } from '@nestjs/common';

import { CHAIN_ID_ETH } from '@app/common/constant';
import { ERC20Token } from '@app/common/interfaces';

import {
  ERC20Transfer,
  ScanTransfer,
  TransfersResponse,
} from '../../transfers/interfaces/transfers.interfaces';
import { DepositEvent, WithdrawalEvent } from '../interfaces';
import { Web3Provider } from '../web3.provider';

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

  constructor(private readonly chainProvider: Web3Provider) {
    this.ETHProvider = this.chainProvider.instanceEth();
    this.contract = new this.ETHProvider.eth.Contract(this.abi as AbiItem[], this.address);
  }

  // not tested and must be handled with source and destination, 2 calls
  async transferEvents(addresses: string[]): Promise<any> {
    // filter addresses to avoid future errors
    addresses = addresses.filter((a) => Web3.utils.isAddress(a));
    return this.contract.getPastEvents('Transfer', {
      filter: {
        src: addresses,
        // dst: addresses
      },
      fromBlock: 0,
      toBlock: 'latest',
    });
  }

  async depositEvents(addresses: string[]): Promise<DepositEvent[]> {
    // filter addresses to avoid future errors
    addresses = addresses.filter((a) => Web3.utils.isAddress(a));
    return this.contract.getPastEvents('Deposit', {
      filter: {
        dst: addresses,
      },
      fromBlock: 0,
      toBlock: 'latest',
    });
  }

  async withdrawalEvents(addresses: string[]): Promise<WithdrawalEvent[]> {
    // filter addresses to avoid future errors
    addresses = addresses.filter((a) => Web3.utils.isAddress(a));
    return this.contract.getPastEvents('Withdrawal', {
      filter: {
        src: addresses,
      },
      fromBlock: 0,
      toBlock: 'latest',
    });
  }

  static depositsToTransfersResponse(deposits: DepositEvent[]): TransfersResponse<ScanTransfer> {
    const transferResponse: TransfersResponse<ScanTransfer> = {};
    deposits.map((deposit) => {
      const userAddress = deposit.returnValues.dst.toLowerCase();

      if (!transferResponse[userAddress]) {
        transferResponse[userAddress] = [];
      }
      const erc20Transfer: ERC20Transfer = {
        fromAddress: WETH.token.address,
        toAddress: userAddress,
        amount: deposit.returnValues.wad,
        tokenPriceUSD: null,
        totalPriceUSD: null,
        token: {
          address: WETH.token.address,
          chainId: WETH.token.chainId,
          name: WETH.token.name,
          symbol: WETH.token.symbol,
          decimals: WETH.token.decimals,
        },
      };

      let transactionTransfer: ScanTransfer = transferResponse[userAddress].find(
        (t) => t.hash === deposit.transactionHash,
      );
      if (!transactionTransfer) {
        transactionTransfer = {
          chainId: CHAIN_ID_ETH,
          hash: deposit.transactionHash,
          blockNumber: deposit.blockNumber,
          blockTimeStamp: null,
          gas: null,
          gasPrice: null,
          gasUsed: null,
          erc20Transfers: [],
        };
        transactionTransfer.erc20Transfers = [...transactionTransfer.erc20Transfers, erc20Transfer];
        transferResponse[userAddress] = [...transferResponse[userAddress], transactionTransfer];
      } else {
        transactionTransfer.erc20Transfers = [...transactionTransfer.erc20Transfers, erc20Transfer];
        transferResponse[userAddress] = [...transferResponse[userAddress], transactionTransfer];
      }
    });
    return transferResponse;
  }

  static withdrawalsToTransfersResponse(
    withdrawals: WithdrawalEvent[],
  ): TransfersResponse<ScanTransfer> {
    const transferResponse: TransfersResponse<ScanTransfer> = {};
    withdrawals.map((withdrawal) => {
      const userAddress = withdrawal.returnValues.src.toLowerCase();
      if (!transferResponse[userAddress]) {
        transferResponse[userAddress] = [];
      }

      const erc20Transfer: ERC20Transfer = {
        fromAddress: userAddress,
        toAddress: WETH.token.address,
        amount: withdrawal.returnValues.wad,
        tokenPriceUSD: null,
        totalPriceUSD: null,
        token: {
          address: WETH.token.address,
          chainId: WETH.token.chainId,
          name: WETH.token.name,
          symbol: WETH.token.symbol,
          decimals: WETH.token.decimals,
        },
      };

      let transactionTransfer: ScanTransfer = transferResponse[userAddress].find(
        (t) => t.hash === withdrawal.transactionHash,
      );
      if (!transactionTransfer) {
        transactionTransfer = {
          chainId: CHAIN_ID_ETH,
          hash: withdrawal.transactionHash,
          blockNumber: withdrawal.blockNumber,
          blockTimeStamp: null,
          gas: null,
          gasPrice: null,
          gasUsed: null,
          erc20Transfers: [],
        };
        transactionTransfer.erc20Transfers = [...transactionTransfer.erc20Transfers, erc20Transfer];
        transferResponse[userAddress] = [...transferResponse[userAddress], transactionTransfer];
      } else {
        transactionTransfer.erc20Transfers = [...transactionTransfer.erc20Transfers, erc20Transfer];
        transferResponse[userAddress] = [...transferResponse[userAddress], transactionTransfer];
      }
    });
    return transferResponse;
  }
}
