import BigNumber, { BigNumber as BN } from 'bignumber.js';
import { AbiItem } from 'web3-utils';

import { DEFAULT_MULTIPLIER, imBTC, SNX, WBNB_ADDRESS } from '@app/common/constant';
import { Address } from '@app/common/types';

import { ScanTransfer, TransfersResponse } from '../transfers/interfaces/transfers.interfaces';

export const EXCLUDE_TRANSFER_TOKEN_ADDRESSES = [WBNB_ADDRESS, imBTC, SNX];

export const getUniqList = <T = string | number>(values: T[]): T[] => {
  return Array.from(new Set(values));
};

// TODO refactor - transform toLowerCase in dto instead of here?
export function getUniqueAndToLowerCaseArrayData(input: string | string[]): string[] {
  const set: Set<string> = new Set();
  const add = (string): typeof set => set.add(string.toLowerCase());

  if (typeof input === 'string') {
    add(input);
  } else {
    input.forEach(add);
  }

  return Array.from(set);
}

export function transferTokenAddressNotIn(
  tokenAddress: Address,
  excludesAddresses: Address[],
): boolean {
  for (const address of excludesAddresses) {
    if (address.toLowerCase() === tokenAddress) {
      return false;
    }
  }
  return true;
}

type Decimals = string | number;

export function toDecimals(amount: number, decimals: number): number {
  return amount * Math.pow(10, -decimals);
}

export const decimalsDivider = (decimals: Decimals): BigNumber => new BN(10).pow(decimals);

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

// TODO: could be validation added
export function splitToArray(value: string): string[] {
  if (!value) {
    return [];
  }

  return value.toLowerCase().split(',');
}

// notice: not best performant function imo
export function mergeTransfersResponse(
  addresses: string[],
  response1: TransfersResponse<ScanTransfer>,
  response2: TransfersResponse<ScanTransfer>,
): TransfersResponse<ScanTransfer> {
  const finalTransfersResponse: TransfersResponse<ScanTransfer> = {};
  addresses.map((a) => {
    const rsp1: ScanTransfer[] = response1[a];
    const rsp2: ScanTransfer[] = response2[a];
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
        const rsp1TxTransfer: ScanTransfer = rsp1.find((t) => t.hash === hash);
        const rsp2TxTransfer: ScanTransfer = rsp2.find((t) => t.hash === hash);

        let mergedTransfer: ScanTransfer;
        if (rsp1TxTransfer && rsp2TxTransfer) {
          const transfersERC20 = rsp1TxTransfer.erc20Transfers.concat(
            rsp2TxTransfer.erc20Transfers,
          );
          mergedTransfer = {
            chainId: rsp2TxTransfer.chainId,
            hash: rsp2TxTransfer.hash,
            blockNumber: rsp2TxTransfer.blockNumber, // ?
            blockTimeStamp: rsp2TxTransfer.blockTimeStamp
              ? rsp2TxTransfer.blockTimeStamp
              : rsp1TxTransfer.blockTimeStamp,
            gas: rsp2TxTransfer.gas ? rsp2TxTransfer.gas : rsp1TxTransfer.gas, // ?
            gasPrice: rsp2TxTransfer.gasPrice ? rsp2TxTransfer.gasPrice : rsp1TxTransfer.gasPrice, // ?
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

export function excludeSecondArray(keep: string[], exclude: string[]): string[] {
  return keep.filter((a) => !exclude.find((b) => a === b));
}

export const ellipsisPoolsMap = new Map([
  ['0xf9045866e7b372def1eff3712ce55fac1a98daf0', { coins: 2, minter: '' }],
  [
    '0xaf4de8e872131ae328ce21d909c74705d3aaf452',
    { coins: 3, minter: '0x160caed03795365f3a589f10c379ffa7d75d4e76' },
  ],
  [
    '0x373410a99b64b089dfe16f1088526d399252dace',
    { coins: 2, minter: '0x556ea0b4c06d043806859c9490072faadc104b63' },
  ],
  [
    '0x2a435ecb3fcc0e316492dc1cdd62d0f189be5640',
    { coins: 2, minter: '0x2477fb288c5b4118315714ad3c7fd7cc69b00bf9' },
  ],
  [
    '0x0bc3a8239b0a63e945ea1bd6722ba747b9557e56',
    { coins: 2, minter: '0xc6a752948627becab5474a10821df73ff4771a49' },
  ],
  [
    '0x052e566a25ace8934dcc52c41a27b04a7c7eccbe',
    { coins: 2, minter: '0x052e566a25ace8934dcc52c41a27b04a7c7eccbe' },
  ],
  [
    '0xa2520f3596449105bfe899f3d573c4353917eaf8',
    { coins: 2, minter: '0x60e4ed61c6f17972559e86f2125bf8a30f249088' },
  ],
  [
    '0x143d702bc7bfa46c17129bd751f7c6cf2f1ded79',
    { coins: 2, minter: '0xf707df3e4c70e40c2f26c660338dd0c81ad280f1' },
  ],
  [
    '0x8339156534e2d7354eed097a6fb4a5820d8d0d27',
    { coins: 3, minter: '0x2f8e25c21a17bd9d0c337e1b409e73bc959b41be' },
  ],
  [
    '0x151f1611b2e304ded36661f65506f9d7d172beba',
    { coins: 2, minter: '0x780de1a0e4613da6b65cef7f5fb63d14cbdcfb72' },
  ],
]);

// TODO todo move to dummy data folder!
export const abi: AbiItem[] = [
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
