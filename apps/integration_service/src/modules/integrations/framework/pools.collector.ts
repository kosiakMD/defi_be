import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../../../../../jobs/lambda_vaults/src/logger/logger.service';
import { AbiProvider } from './abi.provider';
import { FieldsGroupsMapping } from './config/fields.groups.mapping';
import { ILpAddressFetcher } from './services/lp.address.fetcher.interface';
import { PoolInfoLpAddressFetcher } from './services/pool.info.lp.address.fetcher';

@Injectable()
export class PoolsCollector {
  private lpAddressFetchers: Map<string, ILpAddressFetcher>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly abiProvider: AbiProvider,
    private readonly multicall: MulticallAggregator,
  ) {
    this.lpAddressFetchers = new Map<string, ILpAddressFetcher>([
      ['poolInfo', new PoolInfoLpAddressFetcher(multicall)],
    ]);
  }

  async collect(chefAddress: string, chainCode, chefConfig) {
    const abi = await this.abiProvider.getAbi(chefAddress);

    const lpAddresses = await this.lpAddressFetchers
      .get(chefConfig.lpAddressFetcher)
      .fetchPoolsLps(chainCode, chefAddress, abi);

    return lpAddresses.map((lpAddress) => {
      const instructions = {
        context: {
          lpTokenAddress: lpAddress,
          chainCode: chainCode,
        },
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
  }
}
