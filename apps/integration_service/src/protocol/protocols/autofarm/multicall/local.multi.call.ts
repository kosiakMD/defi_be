import { CallInput, MultiCall } from '@indexed-finance/multicall';
import Web3 from 'web3';

import { Logger } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';

import { StakingInterface, VaultUserInfo } from '../autofarm.interfaces';
import {
  AutoFactoryAbi,
  autofarmAUTOFactory,
  autofarmFactoriesMap,
  autofarmRewardToken,
  AutofarmVaultAbi,
  lpTokenAbi,
} from './util';

export class LocalMultiCall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  private getInputsForAutoStake(address: string, func: string) {
    return {
      target: autofarmAUTOFactory,
      function: func,
      args: [0, address],
    };
  }

  async checkAutoTokenStake(data: StakingInterface[], address: string, poolsTokens: string[]) {
    const input1 = this.getInputsForAutoStake(address, 'stakedWantTokens');
    const input2 = this.getInputsForAutoStake(address, 'userInfo');

    const [, result] = await this.multiCall(AutoFactoryAbi, [input1, input2]);
    if (!result[0].isZero()) {
      data.push({
        poolNum: 0,
        userAddress: address,
        amount: result[0]?.toString(),
        claimable: result[1]?.toString(),
        contractAddress: autofarmRewardToken,
      });
      poolsTokens.push(autofarmRewardToken);
    }
  }

  async getVaultPoolsInfo(data: StakingInterface[], chain: ChainIdEnum): Promise<string[]> {
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

  async getVaultUsersInfo(data: StakingInterface[], chain: ChainIdEnum): Promise<VaultUserInfo[]> {
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
      let count = 0;
      for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
        const to = i + chunkSize > pairs.length ? pairs.length : i + chunkSize;
        const pairsSlice = pairs.slice(i, to);
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
}
