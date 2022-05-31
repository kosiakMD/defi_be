import { CallInput, MultiCall } from '@indexed-finance/multicall';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

import { ChainAbbrEnum, Logger } from '@app/common';

import { AutofarmTokenInfo, StakingInterface, VaultUserInfo } from './autofarm.interfaces';
import {
  AutoFactoryAbi,
  autofarmAUTOFactory,
  autofarmFactoriesMap,
  autofarmPoolLength,
  autofarmRewardToken,
  AutofarmVaultAbi,
  lpTokenAbi,
  StakedTokenAbi,
} from './contracts/autofarm.abi';

export class AutofarmLocalMultiCall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  private static getInputsForAutoStake(address: string, func: string) {
    return {
      target: autofarmAUTOFactory,
      function: func,
      args: [0, address],
    };
  }

  async checkAutoTokenStake(data: StakingInterface[], addresses: string[], poolsTokens: string[]) {
    try {
      const addressesInputs = addresses.map((address) => {
        const input1 = AutofarmLocalMultiCall.getInputsForAutoStake(address, 'stakedWantTokens');
        const input2 = AutofarmLocalMultiCall.getInputsForAutoStake(address, 'userInfo');
        return [input1, input2];
      });

      const [, result] = await this.multiCall(AutoFactoryAbi, addressesInputs.flat());
      for (let i = 0; i < result.length; i += 2) {
        if (!result[0].isZero()) {
          data.push({
            poolNum: 0,
            userAddress: addresses[i / 2],
            amount: result[i]?.toString(),
            claimable: result[i + 1]?.toString(),
            contractAddress: autofarmRewardToken,
          });
          poolsTokens.push(autofarmRewardToken);
        }
      }
    } catch (e) {
      this.logger.error(e, 'checkAutoTokenStake');
    }
  }

  async getVaultPoolsInfo(data: StakingInterface[], chain: ChainAbbrEnum): Promise<string[]> {
    const inputs = data.map((pool) => {
      const input: CallInput = {
        target: autofarmFactoriesMap.get(chain),
        function: 'poolInfo',
        args: [pool.poolNum],
      };
      return input;
    });

    const [, vaultPoolInfo] = await this.multiCall(AutofarmVaultAbi, inputs);
    const poolsAddresses: string[] = [];
    data.forEach((i, index) => {
      i.contractAddress = vaultPoolInfo[index].want.toLowerCase();
      poolsAddresses.push(vaultPoolInfo[index].want.toLowerCase());
    });
    return poolsAddresses;
  }

  async getVaultUsersRewards(
    data: StakingInterface[],
    chain: ChainAbbrEnum,
  ): Promise<VaultUserInfo[]> {
    try {
      const inputs = data.map((pool) => {
        const input: CallInput = {
          target: autofarmFactoriesMap.get(chain),
          function: 'pendingAUTO',
          args: [pool.poolNum, pool.userAddress],
        };
        return input;
      });

      const [, vaultUserInfo] = await this.multiCall(AutofarmVaultAbi, inputs);
      vaultUserInfo?.forEach((info, index) => (data[index].claimable = info.toString()));
      return vaultUserInfo;
    } catch (e) {
      this.logger.error(e, 'getVaultUsersRewards');
      throw e;
    }
  }

  async getStakedPositions(
    stakedPosition: StakingInterface[],
    addresses: string[],
    chain: ChainAbbrEnum,
  ): Promise<StakingInterface[]> {
    const inputs = [];
    addresses.forEach((address) => {
      for (let i = 1; i <= autofarmPoolLength; i++) {
        inputs.push({
          target: autofarmFactoriesMap.get(chain),
          function: 'stakedWantTokens',
          args: [i, address],
        });
      }
    });

    const step = 50;
    for (let i = 0; i < inputs.length; i += step) {
      const sliceInput = inputs.slice(i, i + step);
      const [, stakedWantTokens] = await this.multiCall(AutoFactoryAbi, sliceInput);
      stakedWantTokens.forEach((amount, index) => {
        if (amount && !amount.isZero()) {
          const poolIndex = i + index + 1;
          const poolNum = poolIndex % autofarmPoolLength;
          stakedPosition.push({
            poolNum,
            userAddress: addresses[Math.floor(poolIndex / autofarmPoolLength)],
            amount: amount.toString(),
          });
        }
      });
    }

    return stakedPosition;
  }

  async getToken0AndToken1FromLp(
    stakingPosition: StakingInterface[],
    uniqueAddresses: Set<string>,
  ): Promise<void> {
    const input: CallInput[] = [];
    stakingPosition.forEach((pool) => {
      input.push({
        target: pool.contractAddress,
        function: 'token0',
      });

      input.push({
        target: pool.contractAddress,
        function: 'token1',
      });
    });

    const result = await this.multiCall(lpTokenAbi, input);
    const tokensAddress = result[1];
    let count = 0;
    for (let i = 0; i < tokensAddress.length; i += 2) {
      const staking = stakingPosition[count];
      staking.token0 = tokensAddress[i]?.toLowerCase();
      staking.token1 = tokensAddress[i + 1]?.toLowerCase();
      uniqueAddresses.add(staking.token0);
      uniqueAddresses.add(staking.token1);
      uniqueAddresses.add(staking.contractAddress);
      count++;
    }
  }

  async getTotalSupplies(pairs: string[], stakingPositions: StakingInterface[]): Promise<void> {
    try {
      const chunkSize = 50;
      for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
        const to = i + chunkSize > pairs.length ? pairs.length : i + chunkSize;
        const pairsSlice = pairs.slice(i, to);
        const inputs: CallInput[] = pairsSlice.map((p) => {
          return { target: p, function: 'totalSupply' };
        });
        const [, multicallSupplies] = await this.multiCall(lpTokenAbi, inputs);
        for (let k = 0; k < to; k++) {
          const staking = stakingPositions[i + k];
          staking.totalSupply = multicallSupplies[k]?.toString();
        }
      }
    } catch (e) {
      this.logger.error(e, 'getTotalSupplies');
      throw e;
    }
  }

  // TODO getTokens coefficients and totalSupply via web3
  async getTokensInfoMap(
    stakingPositions: StakingInterface[],
    priceAssets: Set<string>,
  ): Promise<Map<string, AutofarmTokenInfo>> {
    const contractFunctions = ['token', 'totalSupply', 'totalToken', 'balanceStrategy'];
    const inputs: CallInput[] = stakingPositions.flatMap((pool) => {
      return contractFunctions.map((func) => {
        return { target: pool.contractAddress, function: func };
      });
    });
    const tokensMap = new Map<string, AutofarmTokenInfo>();
    const [, result] = await this.multiCall(StakedTokenAbi, inputs);
    let count = 0;
    for (let i = 0; i < result.length; i += 4) {
      const stakingPosition = stakingPositions[count];
      const totalSupply = result[i + 1]?.toString();
      const totalToken = result[i + 2]?.toString();
      const balancesStrategy = result[i + 3]?.toString();
      const stakedToken = result[i]?.toLowerCase() || stakingPosition.contractAddress;
      priceAssets.add(stakedToken);
      stakingPosition.totalSupply = totalSupply;
      tokensMap.set(stakingPosition.contractAddress, {
        priceAsset: stakedToken,
        totalSupply: totalSupply,
        coefficient: totalToken
          ? AutofarmLocalMultiCall.getCoefficient(totalToken, totalSupply)
          : balancesStrategy
          ? AutofarmLocalMultiCall.getCoefficient(balancesStrategy, totalSupply)
          : null,
      });
      count++;
    }
    return tokensMap;
  }

  private static getCoefficient(totalToken: string, totalSupply: string): string {
    return new BigNumber(totalToken) //
      .div(totalSupply)
      .toString();
  }
}
