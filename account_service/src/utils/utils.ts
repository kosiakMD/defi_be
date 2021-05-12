import { BigNumber as BN } from 'bignumber.js';

import { Transfer, TransfersResponse } from '../transfers/interfaces/transfers.interfaces';

export const DEFAULT_MULTIPLIER = 1e-18;
export const ETH_BNB_ADDRESS = '0x0000000000000000000000000000000000000000';
export const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
export const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
export const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
export const ESD_ADDRESS = '0x36f3fd68e7325a35eb768f1aedaae9ea0689d723';

export const CHAIN_ID_ETH = 1;
export const CHAIN_ID_BSC = 2;

export function getUniqueAndToLowerCaseArrayData(array: string[]): string[] {
  const temp: string[] = [];
  array.forEach((el) => {
    if (!temp.includes(el.toLowerCase())) {
      temp.push(el.toLowerCase());
    }
  });
  return temp;
}

type Decimals = string | number;

export function toDecimals(amount: number, decimals: number) {
  return amount * Math.pow(10, -decimals);
}

export const decimalsDivider = (decimals: Decimals) => new BN(10).pow(decimals);

export const decimalsAmount = (amount: string, decimals: Decimals): number =>
  new BN(amount) //
    .div(decimalsDivider(decimals))
    .toNumber();

export const transactionFeeUSD = (
  gasPrice: number,
  gasUsed: number,
  decimals: string | number,
  ethPrice: number,
): number =>
  new BN(gasPrice) //
    .times(gasUsed)
    .div(decimalsDivider(decimals))
    .times(ethPrice)
    .toNumber();

export const totalPrice = (amount: string, price: number, decimals: string | number): number =>
  new BN(amount) //
    .times(price)
    .div(decimalsDivider(decimals))
    .toNumber();

export const getTokenDecimals = (decimals: number): number =>
  decimals ? Math.pow(10, -decimals) : DEFAULT_MULTIPLIER;

export function splitToArray(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.toLowerCase().split(',');
}

// notice: not best performant function imo
export function mergeTransfersResponse(
  addresses: string[],
  response1: TransfersResponse,
  response2: TransfersResponse,
): TransfersResponse {
  const finalTransfersResponse: TransfersResponse = {};
  addresses.map((a) => {
    const rsp1: Transfer[] = response1[a];
    const rsp2: Transfer[] = response2[a];
    if (!rsp1 && !rsp2) {
      finalTransfersResponse[a] = [];
    } else if (rsp1 && !rsp2) {
      finalTransfersResponse[a] = rsp1;
    } else if (!rsp1 && rsp2) {
      finalTransfersResponse[a] = rsp2;
    } else {
      // get all transaction hashes for current address
      let transactionHashes = rsp1.map((t) => t.hash).concat(rsp2.map((t2) => t2.hash));
      // get unique
      transactionHashes = transactionHashes.reduce((a, c) => {
        if (!a.some((h) => h === c)) {
          a.push(c);
        }
        return a;
      }, []);

      transactionHashes.map((hash) => {
        const rsp1TxTransfer: Transfer = rsp1.find((t) => t.hash === hash);
        const rsp2TxTransfer: Transfer = rsp2.find((t) => t.hash === hash);

        let mergedTransfer: Transfer;
        if (rsp1TxTransfer && rsp2TxTransfer) {
          const transfersERC20 = rsp1TxTransfer.erc20Transfers.concat(
            rsp2TxTransfer.erc20Transfers,
          );
          mergedTransfer = {
            chainId: rsp2TxTransfer.chainId,
            hash: rsp2TxTransfer.hash,
            blockNumber: rsp2TxTransfer.blockNumber,
            blockTimeStamp: rsp2TxTransfer.blockTimeStamp
              ? rsp2TxTransfer.blockTimeStamp
              : rsp1TxTransfer.blockTimeStamp,
            gas: rsp2TxTransfer.gas ? rsp2TxTransfer.gas : rsp1TxTransfer.gas,
            gasPrice: rsp2TxTransfer.gasPrice ? rsp2TxTransfer.gasPrice : rsp1TxTransfer.gasPrice,
            gasUsed: rsp2TxTransfer.gasUsed ? rsp2TxTransfer.gasUsed : rsp1TxTransfer.gasUsed,
            erc20Transfers: transfersERC20,
          };
        } else if (rsp1TxTransfer) {
          mergedTransfer = rsp1TxTransfer;
        } else {
          mergedTransfer = rsp2TxTransfer;
        }

        if (!finalTransfersResponse[a]) {
          finalTransfersResponse[a] = [mergedTransfer];
        } else {
          finalTransfersResponse[a] = [...finalTransfersResponse[a], mergedTransfer];
        }
      });
    }
  });

  return finalTransfersResponse;
}

export const abi = [
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

export const multicallAbi = [
  {
    constant: true,
    inputs: [],
    name: 'getCurrentBlockTimestamp',
    outputs: [{ name: 'timestamp', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate',
    outputs: [
      { name: 'blockNumber', type: 'uint256' },
      { name: 'returnData', type: 'bytes[]' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'getLastBlockHash',
    outputs: [{ name: 'blockHash', type: 'bytes32' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'addr', type: 'address' }],
    name: 'getEthBalance',
    outputs: [{ name: 'balance', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'getCurrentBlockDifficulty',
    outputs: [{ name: 'difficulty', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'getCurrentBlockGasLimit',
    outputs: [{ name: 'gaslimit', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'getCurrentBlockCoinbase',
    outputs: [{ name: 'coinbase', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: 'blockNumber', type: 'uint256' }],
    name: 'getBlockHash',
    outputs: [{ name: 'blockHash', type: 'bytes32' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];
