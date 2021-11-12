import { CallInput, MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import { Address, ChainAbbrEnum, Logger } from '@app/common';

import { LeverageFarmingInterface } from '../../../../alpaca/alpaca.interfaces';
import { MulticallContractFunctionEnum } from '../../../../multicall/multicall.enum';
import { concatStrings } from '../../../../utils/string';
import {
  AlpacaApiResponse,
  AlpacaStakingInterface,
  AlpacaTokenInfo,
  WorkerContractData,
  TokenContractData,
  TokensBalance,
  VaultUserInfo,
  BorrowBalance,
} from '../alpaca.interfaces';
import {
  alpacaFactoriesMap,
  alpacaLegacyToken,
  alpacaPoolsLength,
  alpacaRewardToken,
  AlpacaStakeContractAbi,
  alpacaStakeContracts,
  cakeAddress,
  lpTokenAbi,
  StakedTokenAbi,
  workerAbi,
  zeroAddress,
} from './util';

export class LocalMultiCall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  async getLpTokensBalances(workersData: WorkerContractData[]): Promise<TokensBalance> {
    const inputs = workersData.map((leverage) => {
      return {
        target: leverage.worker,
        function: 'shareToBalance',
        args: [leverage.shares],
      };
    });
    const chunkSize = 50;
    const lpBalances = {};
    try {
      for (let i = 0; i < inputs.length; i += chunkSize) {
        const sliceInput = inputs.slice(i, i + chunkSize);
        const [, shareToBalance] = await this.multiCall(workerAbi, sliceInput);
        shareToBalance.forEach((balance, index) => {
          const worker = workersData[i + index];
          const field = concatStrings(worker.poolToken, worker.positionId);
          lpBalances[field] = balance?.toString();
        });
      }
      return lpBalances;
    } catch (e) {
      this.logger.error(e, 'getLpTokensBalances');
      throw e;
    }
  }

  async getVaultPoolsInfo(
    data: AlpacaStakingInterface[],
    chain: ChainAbbrEnum,
  ): Promise<Set<string>> {
    const inputs = data.map((pool) => {
      return {
        target: alpacaFactoriesMap.get(chain),
        function: MulticallContractFunctionEnum.poolInfo,
        args: [pool.poolNum],
      };
    });

    const [, vaultPoolInfo] = await this.multiCall(AlpacaStakeContractAbi, inputs);
    const stakedTokensAddresses = new Set<string>();
    data.forEach((i, index) => {
      i.stakeToken = vaultPoolInfo[index].stakeToken.toLowerCase();
      stakedTokensAddresses.add(i.stakeToken);
    });
    return stakedTokensAddresses;
  }

  async getStakingPositions(
    chain: ChainAbbrEnum,
    address: Address,
  ): Promise<AlpacaStakingInterface[]> {
    const inputs = [];
    for (let i = 0; i < alpacaPoolsLength; i++) {
      inputs.push({
        target: alpacaFactoriesMap.get(chain),
        function: 'userInfo',
        args: [i, address],
      });
    }

    const [, userInfo] = await this.multiCall(AlpacaStakeContractAbi, inputs);
    const stakingPositions: AlpacaStakingInterface[] = [];
    userInfo.forEach((data, index) => {
      if (!data.amount.isZero()) {
        stakingPositions.push({
          poolNum: index,
          userAddress: address,
          amount: data.amount.toString(),
        });
      }
    });
    return stakingPositions;
  }

  async getVaultUsersInfo(
    data: AlpacaStakingInterface[],
    chain: ChainAbbrEnum,
  ): Promise<VaultUserInfo[]> {
    const inputs = data.map((pool) => {
      return {
        target: alpacaFactoriesMap.get(chain),
        function: 'pendingAlpaca',
        args: [pool.poolNum, pool.userAddress],
      };
    });

    const [, vaultUserInfo] = await this.multiCall(AlpacaStakeContractAbi, inputs);
    data.forEach((i, index) => (i.claimable = vaultUserInfo[index].toString()));
    return vaultUserInfo;
  }

  async getTotalSupplies(
    tokens: string[],
    stakingPositions: AlpacaStakingInterface[],
  ): Promise<void> {
    try {
      const chunkSize = 50;
      let count = 0;
      for (let i = 0, j = tokens.length; i < j; i += chunkSize) {
        const to = i + chunkSize > tokens.length ? tokens.length : i + chunkSize;
        const pairsSlice = tokens.slice(i, to);
        const inputs: CallInput[] = pairsSlice.map((p) => {
          return { target: p, function: 'totalSupply' };
        });
        const [, multicallSupplies] = await this.multiCall(lpTokenAbi, inputs);
        for (let i = 0; i < to; i++) {
          const staking = stakingPositions[count * chunkSize + i];
          staking.totalSupply = multicallSupplies[i]?.toString();
        }
        count++;
      }
    } catch (e) {
      this.logger.error(e, 'getTotalSupplies');
      throw e;
    }
  }

  async getTokensInfoMap(
    tokens: string[],
    priceAssets: Set<string>,
  ): Promise<Map<string, AlpacaTokenInfo>> {
    const contractFunctions = ['token', 'totalSupply', 'totalToken'];
    const inputs = tokens.flatMap((pool) => {
      return contractFunctions.map((func) => {
        return { target: pool, function: func };
      });
    });
    const tokensMap = new Map<string, AlpacaTokenInfo>();
    const [, result] = await this.multiCall(StakedTokenAbi, inputs);
    for (let i = 0; i < result.length; i += contractFunctions.length) {
      const tokenAddress = tokens[i / contractFunctions.length];
      const totalSupply = result[i + 1]?.toString();
      let totalToken = result[i + 2]?.toString();
      let stakedToken = result[i]?.toLowerCase() || tokenAddress;
      priceAssets.add(stakedToken);
      if (tokenAddress === alpacaLegacyToken) {
        totalToken = totalSupply;
        stakedToken = alpacaRewardToken;
      }
      tokensMap.set(tokenAddress, {
        priceAsset: stakedToken,
        totalSupply: totalSupply,
        coefficient:
          new BigNumber(totalToken) //
            .div(totalSupply)
            .toString() || null,
      });
    }
    return tokensMap;
  }

  async getWorkerContractsData(
    positions: AlpacaApiResponse[],
    tokenAddresses: Set<string>,
  ): Promise<LeverageFarmingInterface[]> {
    const workerFunctions = ['lpToken', 'baseToken', 'shares'];
    const inputs = positions.flatMap((position) => {
      return workerFunctions.map((func) => {
        if (func === 'shares') {
          return { target: position.worker, function: func, args: [position.positionId] };
        }
        return { target: position.worker, function: func };
      });
    });

    const chunkSize = 45;
    let count = 0;
    const workersData: WorkerContractData[] = [];
    for (let i = 0; i < inputs.length; i += chunkSize) {
      const to = i + chunkSize > inputs.length ? inputs.length : i + chunkSize;
      const slice = inputs.slice(i, to);
      const [, result] = await this.multiCall(workerAbi, slice);
      for (let k = 0; k < result.length; k += workerFunctions.length) {
        const index = (count * chunkSize + k) / workerFunctions.length;
        const workerData: WorkerContractData = {
          vault: positions[index].vault,
          worker: positions[index].worker,
          positionId: positions[index].positionId,
          baseToken: result[k + 1]?.toLowerCase(),
          isLp: false,
          shares: result[k + 2]?.toString(),
        };

        if (result[k] !== zeroAddress) {
          workerData.poolToken = result[k]?.toLowerCase();
          workerData.isLp = true;
        } else {
          workerData.poolToken = cakeAddress;
        }

        workersData.push(workerData);
        this.addValuesToSet(tokenAddresses, [workerData.poolToken, workerData.baseToken]);
      }
      count++;
    }
    return workersData;
  }

  async getLpTokenData(
    workersData: WorkerContractData[],
    tokenAddresses: Set<string>,
  ): Promise<TokenContractData> {
    const lpFunctions = ['getReserves', 'totalSupply', 'token0', 'token1'];
    try {
      const inputs = workersData.flatMap((position) => {
        return lpFunctions.map((func) => {
          return { target: position.poolToken, function: func };
        });
      });

      const chunkSize = 15 * lpFunctions.length;
      const lpTokensData = {};
      for (let i = 0; i < inputs.length; i += chunkSize) {
        const sliceInput = inputs.slice(i, i + chunkSize);
        const [, result] = await this.multiCall(lpTokenAbi, sliceInput);
        for (let j = 0; j < result.length; j += lpFunctions.length) {
          const workerData = workersData[(i + j) / lpFunctions.length];
          const field = concatStrings(workerData.poolToken, workerData.positionId);
          lpTokensData[field] = {
            // eslint-disable-next-line no-underscore-dangle
            reserve0: result[j]?._reserve0?.toString(),
            // eslint-disable-next-line no-underscore-dangle
            reserve1: result[j]?._reserve1?.toString(),
            totalSupply: result[j + 1]?.toString(),
            token0: result[j + 2]?.toLowerCase(),
            token1: result[j + 3]?.toLowerCase(),
          };
          this.addValuesToSet(tokenAddresses, [
            lpTokensData[field].token0,
            lpTokensData[field].token1,
          ]);
        }
      }
      return lpTokensData;
    } catch (e) {
      this.logger.error(e, 'getLpTokenData');
      throw e;
    }
  }

  async getBorrowBalances(workersData: WorkerContractData[]): Promise<BorrowBalance> {
    const inputs = workersData.map((position) => {
      return {
        target: position.vault,
        function: 'positionInfo',
        args: [position.positionId],
      };
    });
    const chunkSize = 50;
    const tokensBorrowing = {};
    try {
      for (let i = 0; i < inputs.length; i += chunkSize) {
        const sliceInput = inputs.slice(i, i + chunkSize);
        const [, result] = await this.multiCall(StakedTokenAbi, sliceInput);
        result.forEach((balance, index) => {
          const workerData = workersData[i + index];
          const field = concatStrings(workerData.poolToken, workerData.positionId);
          tokensBorrowing[field] = balance[1]?.toString();
        });
      }
      return tokensBorrowing;
    } catch (e) {
      this.logger.error(e, 'getBorrowBalances');
      throw e;
    }
  }

  async getLendingPoolsBalances(
    address: string,
    stakedTokens: Set<string>,
  ): Promise<Map<string, string>> {
    const inputs = alpacaStakeContracts.map((contract) => {
      return {
        target: contract,
        function: 'balanceOf',
        args: [address],
      };
    });

    const [, result] = await this.multiCall(StakedTokenAbi, inputs);
    const lendingBalancesMap = new Map<string, string>();

    result.forEach((data, index) => {
      if (!data.isZero() && !data.isNegative()) {
        stakedTokens.add(alpacaStakeContracts[index]);
        lendingBalancesMap.set(alpacaStakeContracts[index], data?.toString());
      }
    });
    return lendingBalancesMap;
  }

  private addValuesToSet(tokens: Set<string>, addresses: string[]) {
    addresses.forEach((address) => {
      if (address) {
        tokens.add(address);
      }
    });
  }
}
