import axios from 'axios';
import { injectable } from 'inversify';

// FIXME: This should be in config
const ETHERSCAN_KEY = 'UVBZ773WZQ8B6R53APKFFFN4MZ9EZR4F8G';
const baseUrl = 'https://api.etherscan.io/api';

@injectable()
export class EtherscanApi {
  public async getErc20Transfers(address: string): Promise<EtherscanErc20Transfer[]> {
    const { data: { result } } = await axios.get<EtherscanResponse<EtherscanErc20Transfer[]>>(
      `${baseUrl}?module=account&action=tokentx&address=${address}&startblock=0&endblock=999999999&sort=asc&apikey=${ETHERSCAN_KEY}`
    );
    return result || [];
  }

  public async getGasConfirmationTimeEstimate(gasPrice: string): Promise<string> {
    const { data: { result } } = await axios.get<EtherscanResponse<string>>(
      `${baseUrl}?module=gastracker&action=gasestimate&gasprice=${gasPrice}&apikey=${ETHERSCAN_KEY}`
    );
    return result;
  }

  public async getGasOracle(): Promise<EtherscanGasOracleResponse> {
    const { data: { result } } = await axios.get<EtherscanResponse<EtherscanGasOracleResponse>>(
      `${baseUrl}?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_KEY}`
    );
    return result;
  }

  public async getTransactions(address: string): Promise<EtherscanTransaction[]> {
    const { data: { result } } = await axios.get<EtherscanResponse<EtherscanTransaction[]>>(
      `${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_KEY}`
    );
    return result || [];
  }

  public async getInternalTransactions(address: string): Promise<EtherscanTransaction[]> {
    const { data: { result } } = await axios.get<EtherscanResponse<EtherscanTransaction[]>>(
      `${baseUrl}?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_KEY}`
    );
    return result || [];
  }
}

type EtherscanResponse<T> = {
  status: '1' | '0';
  message?: string;
  result?: T;
};

export type EtherscanTransaction = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  ethPriceUSD?: number;
  totalPriceUSD?: number;
};

export type EtherscanErc20Transfer = {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  confirmations: string;
};

type EtherscanGasOracleResponse = {
  LastBlock: string;
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
}