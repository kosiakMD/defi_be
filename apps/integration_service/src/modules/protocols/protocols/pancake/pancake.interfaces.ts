// to be removed once transition to v2 will be completed
import BigNumber from 'bignumber.js';

import { Address, ProjectEnum, ProtocolName, TokenBalance } from '@app/common';

export interface RewardsData {
  poolId: number;
  pendingCake?: BigNumber;
  userAddress: string;
}

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

export interface AccountTokenBalance {
  account: Address;
  amount: string;
  decimalsAmount: number;
  tokenPriceUSD?: number;
  totalPriceUSD?: number;
  token: TokenBalance;
}

export interface AccountBalance extends AccountBalanceBase {
  tokens: Map<Address, AccountTokenBalance>;
}

export interface AccountBalanceBase {
  account: Address;
  totalUsd: number;
}

export type BalancesResponse = Map<Address, AccountBalance>;

export interface LiquidityPoolsRawData {
  id: number;
  address: string;
  chain: number;
  project: ProjectEnum | ProtocolName;
  // eslint-disable-next-line camelcase
  reserve_usd: number;
  apy: string;
  il: string;
  token: string;
  // eslint-disable-next-line camelcase
  pool_tokens: string;
  // eslint-disable-next-line camelcase
  created_at: string;
  // eslint-disable-next-line camelcase
  updated_at: string;
  // eslint-disable-next-line camelcase
  chain_id: number;
}
