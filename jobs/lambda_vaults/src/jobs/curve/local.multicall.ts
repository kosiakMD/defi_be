import { MultiCall } from '@indexed-finance/multicall';
import Web3 from 'web3';

import { ZERO_ADDRESS } from '@app/common/constant';
import { MulticallMethodsEnum } from '@app/common/jobs/multicall.methods.enum';

import { Logger } from '../../logger/logger.service';
import { CurveLpAbis } from './abis/CurveLpAbi';
import { GaugeAbi, GaugeAbis, GaugeRewardAbi } from './abis/GaugeAbi';

export class LocalMultiCall extends MultiCall {
  constructor(private readonly web3: Web3, private readonly logger: Logger) {
    super(web3);
    this.logger = logger;
  }

  async getTokensVirtualPrices(nonRegisterLps: string[], lpMintersMap: Map<string, string>) {
    try {
      const inputs = [];
      const getCallData = (target) => {
        return {
          target: target,
          function: MulticallMethodsEnum.getVirtualPrice,
          args: [],
        };
      };
      nonRegisterLps.forEach((address) => {
        const minter = lpMintersMap.get(address);
        inputs.push(getCallData(minter ?? address));
      });

      const [, resp] = await this.multiCall(CurveLpAbis, inputs);
      return new Map<string, string>(
        resp.map((r, index) => {
          const virtualPrice = r ? r.toString() : '0';
          return [nonRegisterLps[index], virtualPrice];
        }),
      );
    } catch (e) {
      this.logger.error(e, 'getTokensVirtualPrices');
    }
  }

  async getGaugeRewardTokens(gaugeData: { gauge: string; lp: string }[]) {
    const inputs = gaugeData.flatMap((data) => {
      const rewardTokens = [0, 1, 2].map((idx) => {
        return {
          target: data.gauge,
          function: MulticallMethodsEnum.rewardTokens,
          args: [idx],
        };
      });
      const rewardedToken = {
        target: data.gauge,
        function: MulticallMethodsEnum.rewardedToken,
        args: [],
      };
      return [...rewardTokens, rewardedToken];
    });

    const chunkSize = 12 * 4;
    const resultMap = new Map<string, string[]>();
    const promiseArray = [];
    try {
      for (let i = 0; i < inputs.length; i += chunkSize) {
        const sliceInput = inputs.slice(i, i + chunkSize);
        promiseArray.push(this.multiCall(GaugeRewardAbi, sliceInput));
      }

      const rewards = await Promise.all(promiseArray);

      rewards.forEach((rewardsData, index) => {
        const [, rewardTokens] = rewardsData;
        rewardTokens.forEach((reward, i) => {
          if (reward && reward !== ZERO_ADDRESS) {
            const idx = Math.floor((index * chunkSize + i) / 4);
            const gaugeRewards = resultMap.get(gaugeData[idx].gauge);
            gaugeRewards
              ? gaugeRewards.push(reward.toLowerCase())
              : resultMap.set(gaugeData[idx].gauge, [reward.toLowerCase()]);
          }
        });
      });
      return resultMap;
    } catch (e) {
      this.logger.error(e, 'getGaugeRewardTokens');
    }
  }

  async getNonRegisterMinters(nonRegisterLps: string[]): Promise<Map<string, string>> {
    const lpMintersMap = new Map<string, string>();
    const inputs = nonRegisterLps.map((pool) => {
      return {
        target: pool,
        function: GaugeAbi.minter.name,
        args: [],
      };
    });

    const [, result] = await this.multiCall(GaugeAbis, inputs);
    result.forEach((minter, index) => {
      if (minter) {
        lpMintersMap.set(nonRegisterLps[index], minter.toLowerCase());
      }
    });
    return lpMintersMap;
  }
}
