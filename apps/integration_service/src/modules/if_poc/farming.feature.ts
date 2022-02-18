import { plainToClass } from 'class-transformer';

import { ICallData, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { concatStrings } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IFeature } from './feature.interface';

export class FarmingFeature implements IFeature {
  constructor(private readonly logger: Logger, private readonly multicall: MulticallAggregator) {}

  async updateMetadata(cfg) {
    const { address, abi, chainCode } = cfg;
    const poolLengthCall = plainToClass(CallData, {
      address: address,
      abi: abi.poolLength,
    });
    const poolLengthCallResult = await this.multicall.handleInBatches(
      new Map<string, CallData>([['poolLength', poolLengthCall]]),
      chainCode,
    );

    const poolLength = poolLengthCallResult.get('poolLength').output.data;

    const calls = new Map<string, CallData>();
    for (let i = 0; i < poolLength; i++) {
      calls.set(
        concatStrings(address, i),
        plainToClass(CallData, {
          address: address,
          abi: abi.poolInfo,
          input: { data: [i] },
        }),
      );
    }

    const callsRsp = await this.multicall.handleInBatches(calls, chainCode);

    const poolsInfo = [];
    for (let i = 0; i < poolLength; i++) {
      poolsInfo.push({
        poolId: i,
        address: callsRsp.get(concatStrings(address, i)).output.data.lpToken,
      });
    }
    //todo fetch additional info to be able to calculate APR and other stats if needed
    //todo implement calculation in a separate component to be able to replace/reuse it when needed
    this.logger.debug(`FarmingFeature: updateMetadata done!`);
    return poolsInfo;
  }

  async getUserData(protocolCfg, userAddress) {
    const { metadata, chainCode, address } = protocolCfg;

    const calls = new Map<string, CallData>();
    metadata.forEach((pool) => {
      calls.set(
        concatStrings(pool.address, pool.poolId),
        plainToClass(CallData, {
          address: address,
          abi: protocolCfg.abi.userInfo,
          input: { data: [pool.poolId, userAddress] },
        }),
      );
    });

    const userBalances: Map<string, ICallData> = await this.multicall.handleInBatches(
      calls,
      chainCode,
    );

    const result = [];
    userBalances.forEach((callData, contractCallLabel) => {
      if (Number(callData.output.data.amount) > 0) {
        const [poolAddress] = contractCallLabel.split('_');
        result.push({
          poolAddress,
          balance: callData.output.data.amount,
          rewardDebt: callData.output.data.rewardDebt,
        });
      }
    });
    //todo fetch any other information if needed
    return result;
  }
}
