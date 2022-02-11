import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../../../../../../jobs/lambda_vaults/src/logger/logger.service';
import { AbiProvider } from '../abi.provider';
import { FieldsGroupsMapping } from '../config/fields.groups.mapping';
import { Instructions } from '../models';
import { ILpAddressFetcher } from './lp.address.fetcher.interface';
import { LpTokenLpAddressFetcher } from './lp.token.lp.address.fetcher';
import { PoolInfoLpAddressFetcher } from './pool.info.lp.address.fetcher';

@Injectable()
export class InstructionsCollector {
  private lpAddressFetchers: Map<string, ILpAddressFetcher>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly abiProvider: AbiProvider,
    private readonly multicall: MulticallAggregator,
  ) {
    this.lpAddressFetchers = new Map<string, ILpAddressFetcher>([
      ['poolInfo', new PoolInfoLpAddressFetcher(multicall)],
      ['lpToken', new LpTokenLpAddressFetcher(multicall)],
    ]);
  }

  async collect(chainCode, chefAddress, lpAddressFetcher, fields): Promise<Instructions[]> {
    const abi = await this.abiProvider.getAbi(chefAddress);

    const lpAddresses = await this.lpAddressFetchers
      .get(lpAddressFetcher)
      .fetchPoolsLps(chainCode, chefAddress, abi);

    return lpAddresses.map((lpAddress, poolId) => {
      const instructions = {
        context: {
          lpTokenAddress: lpAddress,
          chainCode: chainCode,
        },
        chainCalls: [],
        fieldsMapping: {},
      };
      let chainCallsCount = 0;
      Object.keys(fields).forEach((field) => {
        const fGroupConfig = FieldsGroupsMapping[field][fields[field]];
        //TODO extract logic of creating chainCall
        const chainCall: any = {
          address: lpAddress,
          abi: abi[fGroupConfig.call],
        };
        switch (fGroupConfig.call) {
          case 'balanceOf':
            chainCall.inputData = [lpAddress];
            break;
          case 'poolInfo':
            chainCall.address = chefAddress;
            chainCall.inputData = [poolId];
            break;
          case 'totalAllocPoint':
          case 'rewardPerBlock':
            chainCall.address = chefAddress;
            break;
        }
        instructions.chainCalls.push(chainCall);
        instructions.fieldsMapping[field] = `chainCalls.${chainCallsCount}.${fGroupConfig.path}`;
        chainCallsCount++;
      });
      return instructions;
    });
  }
}
