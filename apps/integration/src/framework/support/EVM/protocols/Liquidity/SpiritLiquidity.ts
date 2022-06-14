import { UniswapV2AssetService } from 'apps/integration/src/modules/microservices/uniswap.asset.service';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates } from '../../../interfaces';
import { AbiService } from '../../AbiModule/AbiService';
import { LpFactoryLiquidity } from './LpFactoryLiquidity';

export class SpiritLiquidity extends LpFactoryLiquidity {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    protected assetService: UniswapV2AssetService,
    protected httpService: HttpService,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    allPools: () => (item) => item.name === 'allPairs',
    allPoolsLength: () => (item) => item.name === 'allPairsLength',
  };
}
