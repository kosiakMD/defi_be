import { BaseData } from 'apps/integration_service/src/common/interfaces/transactions.interfaces';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  ProtocolNameEnum,
} from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import AbstractProtocol from '../abstract-protocol';
import DataProviderProtocol from '../data-provider-protocol';
import { WingRidersFarms } from './wingriders.farms';
import { WingRidersPools } from './wingriders.pools';

@Injectable()
export class WingRidersProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.cardano];
  readonly project = ProjectEnum.wingriders;
  readonly displayName = 'WingRiders';
  readonly name = ProtocolNameEnum.wingriders;
  readonly features = {
    [ChainAbbrEnum.cardano]: [FeatureEnum.pools, FeatureEnum.staking],
  };

  protected dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly poolService: WingRidersPools,
    protected readonly farmsService: WingRidersFarms,
  ) {
    super();
    this.dataProvider = this;
  }

  private getFeatureData(addresses: Address[], chain: ChainDto, feature: FeatureEnum) {
    switch (feature) {
      case FeatureEnum.pools:
        return this.poolService.getData(addresses, chain, this.name);
      case FeatureEnum.staking:
        return this.farmsService.getData(addresses, chain, this.name);
      default:
        return [];
    }
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const features = this.features[chain.abbr].map((feature: FeatureEnum) =>
      this.getFeatureData(addresses, chain, feature),
    );

    const chainFeatures = await Promise.allSettled(features);

    const [data, errors] = handlePromiseAllSettled(chainFeatures);
    return [data.flat(), errors];
  }
}
