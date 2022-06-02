import { BaseData } from 'apps/integration/src/common/interfaces/transactions.interfaces';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ProtocolNameEnum,
  ChainAbbrEnum,
  FeatureEnum,
  Logger,
  ProjectEnum,
  Address,
  ChainDto,
} from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import AbstractProtocol from '../abstractProtocol';
import DataProviderProtocol from '../dataProviderProtocol';
import { OsmosisLocked } from './osmosis.locked';
import { OsmosisPools } from './osmosis.pools';

@Injectable()
export default class OsmosisProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.osmosis];
  readonly project = ProjectEnum.osmosis;
  readonly displayName = 'Osmosis';
  readonly name = ProtocolNameEnum.osmosis;
  readonly features = {
    [ChainAbbrEnum.osmosis]: [FeatureEnum.pools, FeatureEnum.lockedBalances],
  };

  protected dataProvider;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly poolService: OsmosisPools,
    protected readonly lockedService: OsmosisLocked,
  ) {
    super();
    this.dataProvider = this;
  }

  private getFeatureData(addresses: Address[], chain: ChainDto, feature: FeatureEnum) {
    switch (feature) {
      case FeatureEnum.pools:
        return this.poolService.getData(addresses, chain, this.name);
      case FeatureEnum.lockedBalances:
        return this.lockedService.getData(addresses, chain, this.name);
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
