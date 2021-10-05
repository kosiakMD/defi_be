import { JsonFragment } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { CallInput, MultiCall } from '@indexed-finance/multicall';
import { Interface } from 'ethers/lib/utils';
import Web3 from 'web3';

import { Injectable } from '@nestjs/common';

import { Address, Balance, MulticallFunctionEnum } from '..';
import { toChunkedArray } from '../utils/transform';

@Injectable()
export class MultiCallService extends MultiCall {
  constructor(protected readonly web3Provider: Web3) {
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
        function: MulticallFunctionEnum.earned,
        args: [accountAddress],
      }));

      const [, earned]: [number, BigNumber[]] = await this.multiCall(contractAbi, inputs);

      contractsAddresses.forEach((contractAddress, index) =>
        result.set(contractAddress.toLocaleLowerCase(), earned[index].toString()),
      );
    }

    return result;
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
        function: MulticallFunctionEnum.token0,
      }));

      const inputs1: CallInput[] = contractsAddresses.map((contractAddress) => ({
        target: contractAddress,
        function: MulticallFunctionEnum.token1,
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
