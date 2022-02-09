import { JsonFragment } from '@ethersproject/abi';
import { CallInput, MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import { Interface } from 'ethers/lib/utils';

import { Injectable } from '@nestjs/common';

import { Address, Balance } from '@app/common';
import { toChunkedArray } from '@app/common/utils/transform';
import { Web3Interface } from '@app/common/web3provider';

@Injectable()
export class QuickswapMulticallService extends MultiCall {
  constructor(protected readonly web3Provider: Web3Interface) {
    super(web3Provider);
  }

  async getBalancesOf(
    contractsAddresses: Address[],
    accountAddress: Address,
  ): Promise<Map<Address, Balance>> {
    const result = new Map<Address, Balance>();
    const [, balances] = await this.getBalances(contractsAddresses, accountAddress);

    contractsAddresses.forEach((contractAddress) => {
      result.set(contractAddress.toLocaleLowerCase(), balances[contractAddress].toString());
    });

    return result;
  }

  async getEarned(
    contractsAddresses: Address[],
    accountAddress: Address,
    contractAbi: Interface | JsonFragment[],
  ): Promise<Map<Address, Balance>> {
    const CHUNK_SIZE = 58;

    const result = new Map<Address, Balance>();

    const chunkedContractsAddresses = toChunkedArray(contractsAddresses, CHUNK_SIZE);

    for (const contractsAddresses of chunkedContractsAddresses) {
      const inputs: CallInput[] = contractsAddresses.map((contractAddress) => ({
        target: contractAddress,
        function: 'earned',
        args: [accountAddress],
      }));

      const [, earned]: [number, BigNumber[]] = await this.multiCall(contractAbi, inputs);

      contractsAddresses.forEach((contractAddress, index) =>
        result.set(contractAddress.toLocaleLowerCase(), earned[index].toString()),
      );
    }

    return result;
  }

  async getEarnedDual(
    contractsAddresses: Address[],
    accountAddress: Address,
    contractAbi: Interface | JsonFragment[],
  ): Promise<Map<string, string[]>> {
    const CHUNK_SIZE = 58;

    // containce key => [A and B rewards]
    const result = new Map<string, string[]>();

    const chunkedContractsAddresses: Address[][] = toChunkedArray(contractsAddresses, CHUNK_SIZE);

    for (const contractsAddresses of chunkedContractsAddresses) {
      let inputEearned: CallInput[] = this.getDualContractsAddress(contractsAddresses, accountAddress);
      const [, earned]: [number, BigNumber[]] = await this.multiCall(contractAbi, inputEearned);

      contractsAddresses.map((address) => {
        result.set(address.toLocaleLowerCase(), earned.map(v => v.toString()));
      });
    }

    return result;
  }

  private getDualContractsAddress(contractsAddresses: Address[], accountAddress: Address): CallInput[] {
    return contractsAddresses.map(contractAddress => [
      {
        target: contractAddress,
        function: 'earnedA',
        args: [accountAddress],
      }, {
        target: contractAddress,
        function: 'earnedB',
        args: [accountAddress],
      }
    ]).flat();
  }



  async getStakingTokens(
    contractsAddresses: Address[],
    contractAbi: Interface | JsonFragment[],
  ): Promise<Map<Address, [Address, Address]>> {
    const CHUNK_SIZE = 34;

    const result = new Map<Address, [Address, Address]>();

    const tokens0: Address[] = [];
    const tokens1: Address[] = [];

    const chunkedContractsAddresses: Address[][] = toChunkedArray(contractsAddresses, CHUNK_SIZE);

    for (const contractsAddresses of chunkedContractsAddresses) {
      const inputs0: CallInput[] = contractsAddresses.map((contractAddress) => ({
        target: contractAddress,
        function: 'token0',
      }));

      const inputs1: CallInput[] = contractsAddresses.map((contractAddress) => ({
        target: contractAddress,
        function: 'token1',
      }));

      const [, chunkedTokens]: [number, Address[]] = await this.multiCall(contractAbi, [
        ...inputs0,
        ...inputs1,
      ]);

      tokens0.push(...chunkedTokens.slice(0, chunkedTokens.length / 2));
      tokens1.push(...chunkedTokens.slice(chunkedTokens.length / 2));
    }

    contractsAddresses.forEach((contractAddress, index) => {
      result.set(contractAddress.toLocaleLowerCase(), [tokens0[index], tokens1[index]]);
    });

    return result;
  }
}
