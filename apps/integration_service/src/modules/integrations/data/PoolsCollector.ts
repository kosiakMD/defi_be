import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { CallData } from '@app/common/dto/CallData';
import { concatStrings } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../../../../../jobs/lambda_vaults/src/logger/logger.service';
import { AbiProvider } from './AbiProvider';
import { FieldsGroupsMapping } from './fields.groups.mapping';

interface LpAddressFetcher {
  fetchPoolsLps(chainId: number, address: string, abi: any);
}

class PoolInfoLpAddressFetcher implements LpAddressFetcher {
  constructor(private readonly multicall: MulticallAggregator) {}
  async fetchPoolsLps(chainId: number, address: string, abi: any) {
    const poolLengthCall = plainToClass(CallData, {
      address: address,
      abi: abi.poolLength,
    });
    const poolLengthCallResult = await this.multicall.handleInBatches(
      new Map<string, CallData>([['poolLength', poolLengthCall]]),
      chainId,
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

    const callsRsp = await this.multicall.handleInBatches(calls, chainId);

    const lpAddresses = [];
    for (let i = 0; i < poolLength; i++) {
      lpAddresses.push(callsRsp.get(this.poolInfoLabel(address, i)).output.data.lpToken);
    }
    return lpAddresses;
  }

  poolInfoLabel(address, poolId) {
    return concatStrings(address, poolId);
  }
}

@Injectable()
export class PoolsCollector {
  private lpAddressFetchers: Map<string, LpAddressFetcher>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly abiProvider: AbiProvider,
    private readonly multicall: MulticallAggregator,
  ) {
    this.lpAddressFetchers = new Map<string, LpAddressFetcher>([
      ['poolInfo', new PoolInfoLpAddressFetcher(multicall)],
    ]);
  }

  async collect(chefAddress: string, chainId: number, chefConfig) {
    const abi = await this.abiProvider.getAbi(chefAddress);

    const lpAddresses = await this.lpAddressFetchers
      .get(chefConfig.lpAddressFetcher)
      .fetchPoolsLps(chainId, chefAddress, abi);

    const result = lpAddresses.map((lpAddress) => {
      const instructions = {
        chainCalls: [],
        fieldsMapping: {},
      };
      let chainCallsCount = 0;
      Object.keys(chefConfig.fields).forEach((field) => {
        const fGroupConfig = FieldsGroupsMapping[field][chefConfig.fields[field]];
        instructions.chainCalls.push({
          address: lpAddress,
          abi: abi[fGroupConfig.call],
        });
        instructions.fieldsMapping[field] = `chainCalls.${chainCallsCount}.${fGroupConfig.path}`;
        chainCallsCount++;
      });
      return instructions;
    });

    return result;
  }
}
