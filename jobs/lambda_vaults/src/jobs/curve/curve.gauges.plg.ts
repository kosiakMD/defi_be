import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';
import { concatStrings } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { CurveAddressesPlg } from './addresses';
import { CurveGaugesBase } from './curve.gauges.base';
import { LocalMultiCall } from './local.multicall';

@Injectable()
export class CurveGaugesPlg extends CurveGaugesBase {
  chain = ChainIdEnum.plg;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected registryV1Contract = CurveAddressesPlg.registryV1;
  protected registryV2Contract = CurveAddressesPlg.registryV2;

  protected localMulticall;
  protected mapping = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly web3Provider: Web3ProviderService,
    protected readonly priceService: PriceService,
  ) {
    super(logger, accountService, storeService, multicallService, web3Provider, priceService);
    this.localMulticall = new LocalMultiCall(
      this.web3Provider.getInstanceByChainId(this.chain),
      this.logger,
    );
  }
}
