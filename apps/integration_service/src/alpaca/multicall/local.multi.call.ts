import { CallInput, MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import { Logger } from '@app/common';

import { ChainIdEnum } from '../../common/enum';

import { MulticallContractFunctionEnum } from '../../multicall/multicall.enum';
import {
  AlpacaApiResponse,
  AlpacaStakingInterface,
  AlpacaTokenInfo,
  LeverageFarmingInterface,
  VaultUserInfo,
} from '../alpaca.interfaces';
import {
  alpacaFactoriesMap,
  alpacaLegacyToken,
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

  async getVaultPoolsInfo(
    data: AlpacaStakingInterface[],
    chain: ChainIdEnum,
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

  async getVaultUsersInfo(
    data: AlpacaStakingInterface[],
    chain: ChainIdEnum,
  ): Promise<VaultUserInfo[]> {
    const inputs = data.map((pool) => {
      return {
        target: alpacaFactoriesMap.get(chain),
        function: MulticallContractFunctionEnum.userInfo,
        args: [pool.poolNum, pool.userAddress],
      };
    });

    const [, vaultUserInfo] = await this.multiCall(AlpacaStakeContractAbi, inputs);
    data.forEach((i, index) => (i.claimable = vaultUserInfo[index].rewardDebt.toString()));
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
    let count = 0;
    for (let i = 0; i < result.length; i += 3) {
      const totalSupply = result[i + 1]?.toString();
      let totalToken = result[i + 2]?.toString();
      let stakedToken = result[i]?.toLowerCase();
      priceAssets.add(stakedToken || tokens[count]);
      if (tokens[count] === alpacaLegacyToken) {
        totalToken = totalSupply;
        stakedToken = alpacaRewardToken;
      }
      tokensMap.set(tokens[count], {
        priceAsset: stakedToken,
        totalSupply: totalSupply,
        coefficient:
          new BigNumber(totalToken) //
            .div(totalSupply)
            .toString() || null,
      });
      count++;
    }
    return tokensMap;
  }

  async getWorkerTokensData(
    positions: AlpacaApiResponse[],
    tokenAddresses: Set<string>,
  ): Promise<LeverageFarmingInterface[]> {
    const workerFunctions = ['lpToken', 'getReversedPath', 'baseToken'];
    const inputs = positions.flatMap((position) => {
      return workerFunctions.map((func) => {
        return { target: position.worker, function: func };
      });
    });
    const leverageInterface: LeverageFarmingInterface[] = [];
    const [, result] = await this.multiCall(workerAbi, inputs);
    let count = 0;
    for (let i = 0; i < result.length; i += 3) {
      const leverageFarming: LeverageFarmingInterface = {
        vault: positions[count].vault,
        positionId: positions[count].positionId,
        baseToken: result[i + 2].toLowerCase(),
        isLp: false,
      };

      if (result[i] !== zeroAddress) {
        leverageFarming.poolToken = result[i].toLowerCase();
        leverageFarming.isLp = true;
        leverageFarming.token0 = result[i + 1][0]?.toLowerCase();
        leverageFarming.token1 = result[i + 1][1]?.toLowerCase();
      } else {
        leverageFarming.poolToken = cakeAddress;
      }

      leverageInterface.push(leverageFarming);
      this.addValuesToSet(tokenAddresses, [
        leverageFarming.poolToken,
        leverageFarming.token0,
        leverageFarming.token1,
        leverageFarming.baseToken,
      ]);

      count++;
    }
    return leverageInterface;
  }

  async getLpTokenData(leverageInterface: LeverageFarmingInterface[]): Promise<void> {
    const lpFunctions = ['getReserves', 'totalSupply'];
    const inputs = leverageInterface.flatMap((position) => {
      return lpFunctions.map((func) => {
        return { target: position.poolToken, function: func };
      });
    });

    const [, result] = await this.multiCall(lpTokenAbi, inputs);
    let count = 0;
    for (let i = 0; i < result.length; i += 2) {
      const leverage = leverageInterface[count];
      // eslint-disable-next-line no-underscore-dangle
      leverage.reserve0 = result[i]?._reserve0?.toString();
      // eslint-disable-next-line no-underscore-dangle
      leverage.reserve1 = result[i]?._reserve1?.toString();
      leverage.totalSupply = result[i + 1].toString();
      count++;
    }
  }

  async getLpTokenBalanceAndBorrow(leverageInterface: LeverageFarmingInterface[]): Promise<void> {
    const inputs = leverageInterface.map((position) => {
      return {
        target: position.vault,
        function: 'positionInfo',
        args: [position.positionId],
      };
    });

    const [, result] = await this.multiCall(StakedTokenAbi, inputs);
    leverageInterface.forEach((position, index) => {
      const balances = result[index];
      position.baseTokenBalance = balances[0]?.toString();
      position.borrow = balances[1]?.toString();
    });
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
