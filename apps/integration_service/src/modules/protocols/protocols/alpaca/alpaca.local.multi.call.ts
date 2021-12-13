import { MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import { Address, ChainAbbrEnum, Logger } from '@app/common';
import { concatStrings } from '@app/common/utils';

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
} from './contracts/alpaca.abi';
import {
  AlpacaApiResponse,
  AlpacaStakingInterface,
  AlpacaTokenInfo,
  BorrowBalance,
  TokenContractData,
  TokensBalance,
  WorkerContractData,
} from './interfaces/alpaca.interfaces';

export class LocalMultiCall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  async getLpTokensBalances(workersData: WorkerContractData[]): Promise<TokensBalance> {
    const inputs = workersData.map((data) => {
      return {
        target: data.worker,
        function: 'shareToBalance',
        args: [data.shares],
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

  async setVaultPoolsTokens(
    data: AlpacaStakingInterface[],
    chain: ChainAbbrEnum,
    tokensAddresses: Set<string>,
  ): Promise<void> {
    const inputs = data.map((pool) => {
      return {
        target: alpacaFactoriesMap.get(chain),
        function: 'poolInfo',
        args: [pool.poolNum],
      };
    });

    const [, vaultPoolInfo] = await this.multiCall(AlpacaStakeContractAbi, inputs);
    data.forEach((i, index) => {
      i.stakeToken = vaultPoolInfo[index].stakeToken.toLowerCase();
      tokensAddresses.add(i.stakeToken);
    });
  }

  async getStakingPositions(
    chain: ChainAbbrEnum,
    addresses: Address[],
  ): Promise<AlpacaStakingInterface[]> {
    try {
      const inputs = [];
      addresses.forEach((address) => {
        for (let i = 0; i < alpacaPoolsLength; i++) {
          inputs.push({
            target: alpacaFactoriesMap.get(chain),
            function: 'userInfo',
            args: [i, address],
          });
        }
      });

      const stakingPositions: AlpacaStakingInterface[] = [];
      const step = Math.ceil(100 / addresses.length);
      const promisesArray = [];
      for (let i = 0; i < inputs.length; i += step) {
        const sliceInput = inputs.slice(i, i + step);
        promisesArray.push(this.multiCall(AlpacaStakeContractAbi, sliceInput));
      }

      const multicallResp = await Promise.all(promisesArray);
      multicallResp.forEach((resp, index) => {
        resp[1].forEach((data, index2) => {
          if (!data.amount.isZero()) {
            stakingPositions.push({
              poolNum: (index2 + index * step) % alpacaPoolsLength,
              userAddress: addresses[Math.floor((index2 + index * step) / alpacaPoolsLength)],
              amount: data.amount.toString(),
            });
          }
        });
      });

      return stakingPositions;
    } catch (e) {
      this.logger.error(e, 'getStakingPositions');
      throw e;
    }
  }

  async getVaultUsersInfo(data: AlpacaStakingInterface[], chain: ChainAbbrEnum): Promise<void> {
    const inputs = data.map((pool) => {
      return {
        target: alpacaFactoriesMap.get(chain),
        function: 'pendingAlpaca',
        args: [pool.poolNum, pool.userAddress],
      };
    });

    const [, vaultUserInfo] = await this.multiCall(AlpacaStakeContractAbi, inputs);
    data.forEach((i, index) => {
      i.claimable = vaultUserInfo[index].toString();
    });
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
  ): Promise<WorkerContractData[]> {
    const workerFunctions = ['lpToken', 'baseToken', 'shares'];
    const inputs = positions.flatMap((position) => {
      return workerFunctions.map((func) => {
        if (func === 'shares') {
          return { target: position.worker, function: func, args: [position.positionId] };
        }
        return { target: position.worker, function: func };
      });
    });

    const chunkSize = workerFunctions.length * 15;
    const workersData: WorkerContractData[] = [];
    for (let i = 0; i < inputs.length; i += chunkSize) {
      const to = i + chunkSize > inputs.length ? inputs.length : i + chunkSize;
      const slice = inputs.slice(i, to);
      const [, result] = await this.multiCall(workerAbi, slice);
      for (let k = 0; k < result.length; k += workerFunctions.length) {
        const index = (i + k) / workerFunctions.length;
        const workerData: WorkerContractData = {
          address: positions[index].owner,
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
    addresses: string[],
    stakedTokens: Set<string>,
  ): Promise<Map<string, { [key: string]: string }>> {
    const inputs = addresses.flatMap((address) => {
      return alpacaStakeContracts.map((contract) => {
        return {
          target: contract,
          function: 'balanceOf',
          args: [address],
        };
      });
    });

    const lendingBalancesMap = new Map<string, { [key: string]: string }>();

    const step = 50;
    for (let i = 0; i < inputs.length; i += step) {
      const sliceInput = inputs.slice(i, i + step);
      const [, result] = await this.multiCall(StakedTokenAbi, sliceInput);
      result.forEach((data, index) => {
        if (!data.isZero() && !data.isNegative()) {
          const contractIndex = index + i;
          const lendContract = alpacaStakeContracts[contractIndex % alpacaStakeContracts.length];
          stakedTokens.add(lendContract);
          const address = addresses[Math.floor(contractIndex / alpacaStakeContracts.length)];
          const lendingBalanceItem = lendingBalancesMap.get(address);
          lendingBalanceItem
            ? (lendingBalanceItem[lendContract] = data?.toString())
            : lendingBalancesMap.set(address, { [lendContract]: data?.toString() });
        }
      });
    }
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
