import { Cache } from 'cache-manager';

import { CACHE_MANAGER, HttpService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import { AbiService } from '../../AbiModule/AbiService';
import { LpFactoryLiquidity } from './LpFactoryLiquidity';

export class SpiritLiquidity extends LpFactoryLiquidity {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
  ) {
    super(logger, cache, abiService, multicall, accountService, priceService, httpService);
  }

  functionPredicates: INamedFunctionPredicates = {
    allPools: () => (item) => item.name === 'allPairs',
    allPoolsLength: () => (item) => item.name === 'allPairsLength',
  };
}
