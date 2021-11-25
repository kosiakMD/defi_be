declare module '@makerdao/multicall' {
  import { BigNumber } from 'bignumber.js';
  import Web3 from 'web3';

  type Call = {
    target: string,
    call: any[],
    returns: any[][],
  };

  type Options = {
    web3?: Web3;
    multicallAddress?: string;
  };

  type MulticallResponse = {
    results: {
      blockNumber: BigNumber;
      original: { [key: string]: any },
      transformed: { [key: string]: any };
    }
  };

  export function aggregate(calls: Call | Call[], options?: Options): Promise<MulticallResponse>
}