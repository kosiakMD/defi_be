import { Address } from 'src/common/types';
import { AccountBalanceBase, TokenBalance } from 'src/common/types/balances';

export interface EtherscanTransfer {
  blockNumber: number;
  timeStamp: number;
  hash: string;
  nonce: number;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  transactionIndex: number;
  gas: number;
  gasPrice: number;
  gasUsed: number;
  cumulativeGasUsed: number;
  input: string;
  confirmations: number;
}

export interface Transfers {
  [key: string]: EtherscanTransfer[];
}

export interface AccountTokenBalance {
  account: Address;
  amount: string;
  decimalsAmount: number;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: TokenBalance;
}

export interface AccountBalance extends AccountBalanceBase {
  tokens: AccountTokenBalance[];
}

export type BalancesResponse = { [key: string]: AccountBalance };
