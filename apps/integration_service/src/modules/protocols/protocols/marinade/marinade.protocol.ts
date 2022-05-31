import { BaseData } from 'apps/integration_service/src/common/interfaces/transactions.interfaces';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  MarinadeProtocolEnum,
  ProjectEnum,
} from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import AbstractProtocol from '../abstract-protocol';
import DataProviderProtocol from '../data-provider-protocol';
import { MarinadePools } from './marinade.pools';
import { MarinadeStaking } from './marinade.staking';

@Injectable()
export class MarinadeProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.sol];
  readonly project = ProjectEnum.marinade;
  readonly displayName = 'Marinade';
  readonly name = MarinadeProtocolEnum.marinade;
  readonly features = {
    [ChainAbbrEnum.sol]: [FeatureEnum.pools, FeatureEnum.staking],
  };

  protected dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly poolService: MarinadePools,
    private readonly stakingService: MarinadeStaking,
  ) {
    super();
    this.dataProvider = this;
  }

  private getFeatureData(addresses: Address[], chain: ChainDto, feature: FeatureEnum) {
    switch (feature) {
      case FeatureEnum.pools:
        return this.poolService.getData(addresses, chain, this.name);
      case FeatureEnum.staking:
        return this.stakingService.getData(addresses, chain);
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

export default MarinadeProtocol;
