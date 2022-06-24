import { IronFinanceAssetService } from 'apps/integration/src/modules/microservices/ironFinance.asset.service';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
import { AbiService } from '../../AbiModule/AbiService';
import { LpFactoryLiquidity } from './LpFactoryLiquidity';

export interface ILiquidityMeta extends IProtocolMeta {
  address: Address;
  feature: any;
  pool: string;
}

export class IronFinanceLiquidity extends LpFactoryLiquidity {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    protected assetService: IronFinanceAssetService,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    getTokens: () => (item) => item.name === 'getTokens',
    getTokenBalances: () => (item) => item.name === 'getTokenBalances',
    getNumberOfTokens: () => (item) => item.name === 'getNumberOfTokens',
  };

  async getPoolsList(): Promise<string[]> {
    return [this.meta.context.pool];
  }
}
