import { JsonFragment } from '@ethersproject/abi';
import { CallInput, MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import { Interface } from 'ethers/lib/utils';
import Web3 from 'web3';

import { Injectable } from '@nestjs/common';

import { Address, Balance } from '@app/common';
import { toChunkedArray } from '@app/common/utils/transform';

import { MulticallContractFunctionEnum, MulticallTokenFunctionEnum } from './multicall.enum';
import {
  ContractData,
  ContractDataInput,
  ContractDataMap,
  ContractPoolInfo,
  ContractUserInfo,
  LPTokenData,
  LPTokenDataInput,
  LPTokenDataMap,
  LPTokenDataResponseInput,
  LPTokenSupplyInput,
  PoolId,
  PoolInfoInput,
  UserInfoInput,
  UserPoolBalanceInput,
  UserPoolBalances,
} from './multicall.types';

@Injectable()
export class MultiCallService extends MultiCall {
  constructor(protected readonly web3Provider: Web3) {
    super(web3Provider);
  }

  public async getPoolCount(
    contractAddress: Address,
    contractAbi: Interface | JsonFragment[],
  ): Promise<number> {
    const [, poolLengthResult] = await this.multiCall(contractAbi, [
      { target: contractAddress, function: MulticallContractFunctionEnum.poolLength },
    ]);
    const poolLength = poolLengthResult[0].toNumber();
    return poolLength;
  }

  public async getContractBaseData(
    contractAddress: Address,
    contractAbi: Interface | JsonFragment[],
  ): Promise<{ poolLength: number; rewardTokenAddress: Address }> {
    const [, results] = await this.multiCall(contractAbi, [
      { target: contractAddress, function: MulticallContractFunctionEnum.poolLength },
      { target: contractAddress, function: MulticallContractFunctionEnum.SUSHI },
    ]);
    const [poolLength, rewardToken]: string[] = results;
    return {
      poolLength: Number(poolLength),
      rewardTokenAddress: rewardToken.toLowerCase(),
    };
  }

  public async getUserPoolsBalances(
    userAddress: Address,
    contractAddress: Address,
    contractAbi: Interface | JsonFragment[],
    poolLength: number,
  ): Promise<UserPoolBalances> {
    const userPoolsBalancesMap: UserPoolBalances = new Map<PoolId, UserPoolBalanceInput>();
    const inputs: CallInput[] = [];

    for (let i = 0; i < poolLength; i++) {
      inputs.push({
        target: contractAddress,
        function: MulticallContractFunctionEnum.userInfo,
        args: [i, userAddress],
      });
    }
    const inputsChunks = toChunkedArray(inputs, 50);

    const userInfos = (
      await Promise.all(
        inputsChunks.map((inputGroup: CallInput[]) => this.multiCall(contractAbi, inputGroup)),
      )
    ).flatMap(([, _result]) => _result);

    userInfos.forEach(({ amount, rewardDebt }, index) => {
      userPoolsBalancesMap.set(index, {
        amount: new BigNumber(amount.toString()),
        rewardDebt: new BigNumber(rewardDebt.toString()),
      });
    });

    return userPoolsBalancesMap;
  }

  async getLPTokenAddresses(
    contractAddress: Address,
    contractAbi: Interface | JsonFragment[],
    poolIds: PoolId[],
  ): Promise<Address[]> {
    const inputs = poolIds.map((poolId) => ({
      target: contractAddress,
      function: MulticallContractFunctionEnum.lpToken,
      args: [poolId],
    }));
    const [, poolsAddresses] = await this.multiCall(contractAbi, inputs);
    return poolsAddresses;
  }

  async getUserPoolsInfo(
    contractAddress: Address,
    contractAbi: Interface | JsonFragment[],
    poolLength,
    userAddress,
    functionsArg?: MulticallContractFunctionEnum[],
  ): Promise<ContractDataMap> {
    const functions = functionsArg || [
      // MulticallContractFunctionEnum.poolLength,
      // MulticallContractFunctionEnum.SUSHI,
      MulticallContractFunctionEnum.lpToken,
      MulticallContractFunctionEnum.poolInfo,
      MulticallContractFunctionEnum.userInfo,
      MulticallContractFunctionEnum.pendingSushi,
    ];
    const args = {
      // [MulticallContractFunctionEnum.poolLength]: 0,
      // [MulticallContractFunctionEnum.SUSHI]: 0,
      [MulticallContractFunctionEnum.lpToken]: 1,
      [MulticallContractFunctionEnum.poolInfo]: 1,
      [MulticallContractFunctionEnum.userInfo]: 2,
      [MulticallContractFunctionEnum.pendingSushi]: 2,
    };
    const inputs: CallInput[] = [];
    for (let i = 0; i < poolLength; i++) {
      functions.forEach((func) => {
        inputs.push({
          target: contractAddress,
          function: func,
          args: args[func] ? (args[func] > 1 ? [i, userAddress] : [i]) : [],
        });
      });
    }

    const inputsChunks = toChunkedArray(inputs, 50);

    const results = (
      await Promise.all(inputsChunks.map((inputGroup) => this.multiCall(contractAbi, inputGroup)))
    ).flatMap(([, _result]: LPTokenDataResponseInput) => _result);

    const contractInfo: ContractDataMap = new Map<PoolId, ContractData>();

    results.reduce(
      (objIn: ContractData, result: ContractDataInput, index) => {
        const poolIndex = Math.floor(index / functions.length);
        const absoluteIndex = index % functions.length;
        const poolId = poolIndex;
        const field = functions[absoluteIndex];

        let obj: ContractData = objIn;
        if (!obj) {
          obj = {
            lpToken: null,
            poolInfo: null,
            poolLength: null,
            userInfo: null,
            pending: null,
          };
        }

        switch (field) {
          case MulticallContractFunctionEnum.lpToken:
            obj.lpToken = result as string;
            break;
          case MulticallContractFunctionEnum.poolInfo:
            // eslint-disable-next-line no-case-declarations
            const { accSushiPerShare, lastRewardTime, allocPoint } = result as PoolInfoInput;
            obj.poolInfo = {
              accPerShare: accSushiPerShare,
              lastRewardTime: lastRewardTime,
              allocPoint: allocPoint,
            } as ContractPoolInfo;
            break;
          // case MulticallContractFunctionEnum.poolLength:
          //   obj.poolLength = result as number;
          //   break;
          case MulticallContractFunctionEnum.userInfo:
            // eslint-disable-next-line no-case-declarations
            const { amount, rewardDebt } = result as UserInfoInput;
            obj.userInfo = {
              amount: new BigNumber(amount.toString()),
              rewardDebt: new BigNumber(rewardDebt.toString()),
            } as ContractUserInfo;
            break;
          case MulticallContractFunctionEnum.pendingSushi:
            obj.pending = new BigNumber(result.toString());
            break;
        }

        // if cycle is over set into map and and return null for new iteration
        if (absoluteIndex + 1 === functions.length) {
          contractInfo.set(poolId, obj);
          return null;
        } else {
          return obj;
        }
      },
      null,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      0,
    );

    return contractInfo;
  }

  async getLpTokenData(
    contractAbi: Interface | JsonFragment[],
    pools: Address[],
    functionsArg?: MulticallTokenFunctionEnum[],
  ): Promise<LPTokenDataMap> {
    const functions = functionsArg || [
      MulticallTokenFunctionEnum.getReserves,
      MulticallTokenFunctionEnum.totalSupply,
      MulticallTokenFunctionEnum.decimals,
      MulticallTokenFunctionEnum.name,
      MulticallTokenFunctionEnum.symbol,
      MulticallTokenFunctionEnum.token0,
      MulticallTokenFunctionEnum.token1,
    ];
    const inputs = pools.flatMap((address) =>
      functions.map((func) => ({ target: address, function: func })),
    );
    const [, results]: LPTokenDataResponseInput = await this.multiCall(contractAbi, inputs);
    const lpTokensInfo: LPTokenDataMap = new Map<Address, LPTokenData>();

    results.reduce(
      (objIn: LPTokenData, result: LPTokenDataInput = {} as any, index) => {
        const poolIndex = Math.floor(index / functions.length);
        const poolAddress = pools[poolIndex];
        const absoluteIndex = index % functions.length;
        const field = functions[absoluteIndex];

        let obj: LPTokenData = objIn;
        if (!obj) {
          obj = {
            address: poolAddress,
            reserve0: null,
            reserve1: null,
            totalSupply: null,
            decimals: null,
            name: null,
            symbol: null,
            token0: null,
            token1: null,
          };
        }

        switch (field) {
          case MulticallTokenFunctionEnum.getReserves:
            // eslint-disable-next-line no-case-declarations
            const { _reserve0, _reserve1 } = result as LPTokenSupplyInput;
            obj.reserve0 = new BigNumber(_reserve0.toString());
            obj.reserve1 = new BigNumber(_reserve1.toString());
            break;
          case MulticallTokenFunctionEnum.totalSupply:
            obj.totalSupply = new BigNumber(result.toString());
            break;
          case MulticallTokenFunctionEnum.decimals:
            obj.decimals = result as number;
            break;
          case MulticallTokenFunctionEnum.name:
            obj.name = result as string;
            break;
          case MulticallTokenFunctionEnum.symbol:
            obj.symbol = result as string;
            break;
          case MulticallTokenFunctionEnum.token0:
            obj.token0 = result as string;
            break;
          case MulticallTokenFunctionEnum.token1:
            obj.token1 = result as string;
            break;
        }

        // if cycle is over set into map and and return null for new iteration
        if (absoluteIndex + 1 === functions.length) {
          lpTokensInfo.set(poolAddress, obj);
          return null;
        } else {
          return obj;
        }
      },
      null,
      0,
    );

    return lpTokensInfo;
  }

  async getPoolTokensData(contractAbi: Interface | JsonFragment[], tokens: Address[]) {
    const functions = [
      MulticallTokenFunctionEnum.getReserves,
      MulticallTokenFunctionEnum.totalSupply,
      MulticallTokenFunctionEnum.decimals,
      MulticallTokenFunctionEnum.name,
      MulticallTokenFunctionEnum.symbol,
    ];
    const inputs = tokens.flatMap((address) =>
      functions.map((func) => ({ target: address, function: func })),
    );
    const [, results]: LPTokenDataResponseInput = await this.multiCall(contractAbi, inputs);
    const lpTokensInfo: LPTokenDataMap = new Map<Address, LPTokenData>();

    results.reduce(
      (objIn: LPTokenData, result: LPTokenDataInput, index) => {
        const poolIndex = Math.floor(index / functions.length);
        const poolAddress = tokens[poolIndex];
        const absoluteIndex = index % functions.length;
        const field = functions[absoluteIndex];

        let obj: LPTokenData = objIn;
        if (!obj) {
          obj = {
            address: poolAddress,
            reserve0: null,
            reserve1: null,
            totalSupply: null,
            decimals: null,
            name: null,
            symbol: null,
            token0: null,
            token1: null,
          };
        }

        switch (field) {
          case MulticallTokenFunctionEnum.getReserves:
            // eslint-disable-next-line no-case-declarations
            const { _reserve0, _reserve1 } = result as LPTokenSupplyInput;
            obj.reserve0 = new BigNumber(_reserve0.toString());
            obj.reserve1 = new BigNumber(_reserve1.toString());
            break;
          case MulticallTokenFunctionEnum.totalSupply:
            obj.totalSupply = new BigNumber(result.toString());
            break;
          case MulticallTokenFunctionEnum.decimals:
            obj.decimals = result as number;
            break;
          case MulticallTokenFunctionEnum.name:
            obj.name = result as string;
            break;
          case MulticallTokenFunctionEnum.symbol:
            obj.symbol = result as string;
            break;
        }

        // if cycle is over set into map and and return null for new iteration
        if (absoluteIndex + 1 === functions.length) {
          lpTokensInfo.set(poolAddress, obj);
          return null;
        } else {
          return obj;
        }
      },
      null,
      0,
    );

    return lpTokensInfo;
  }

  async getPoolInfo(
    contractAddress: Address,
    contractAbi: Interface | JsonFragment[],
    poolIds: PoolId[],
  ): Promise<any> {
    const inputs = poolIds.map((poolId) => ({
      target: contractAddress,
      function: MulticallContractFunctionEnum.poolInfo,
      args: [poolId],
    }));
    const [, poolsInfo] = await this.multiCall(contractAbi, inputs);
    return poolsInfo;
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

  async getTotalSupply(
    contractsAddresses: Address[],
    contractAbi: Interface | JsonFragment[],
  ): Promise<Map<Address, Balance>> {
    const CHUNK_SIZE = 68;

    const result = new Map<Address, Balance>();

    const chunkedContractsAddresses = toChunkedArray(contractsAddresses, CHUNK_SIZE);

    const totalSupplies = await Promise.all(
      chunkedContractsAddresses.map(async (contractsAddresses) => {
        const [, totalSupply]: [number, BigNumber[]] = await this.multiCall(
          contractAbi,
          contractsAddresses.map((contractAddress) => ({
            target: contractAddress,
            function: MulticallTokenFunctionEnum.totalSupply,
          })),
        );

        return totalSupply;
      }),
    );

    chunkedContractsAddresses.forEach((contractsAddresses, i) =>
      contractsAddresses.forEach((contractAddress, j) =>
        result.set(contractAddress.toLocaleLowerCase(), totalSupplies[i][j].toString()),
      ),
    );

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
        function: MulticallTokenFunctionEnum.earned,
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
        function: MulticallTokenFunctionEnum.token0,
      }));

      const inputs1: CallInput[] = contractsAddresses.map((contractAddress) => ({
        target: contractAddress,
        function: MulticallTokenFunctionEnum.token1,
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
