import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { KyberLiquidityPair } from '@app/common/web3provider/contracts/protocols/kyberswap/kyberLiquidityPair';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AbiService } from '../../AbiModule/AbiService';
import { LpFactoryLiquidity } from './LpFactoryLiquidity';

export class KyberLiquidity extends LpFactoryLiquidity {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    protected assetService: FakeAssetService,
    protected httpService: HttpService,
  ) {
    super();
  }

  protected getLpTokenContract(token: string) {
    return new KyberLiquidityPair(token);
  }
}
