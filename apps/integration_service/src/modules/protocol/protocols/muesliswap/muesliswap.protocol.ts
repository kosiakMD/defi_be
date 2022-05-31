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

import { AccountService } from '../../../microservice/account.service';
import { PriceService } from '../../../microservice/price.service';
import AbstractProtocol from '../abstract-protocol';
import DataProviderProtocol from '../data-provider-protocol';
import { MuesliSwapStaking } from './muesliswap.staking';

@Injectable()
export class MuesliSwapProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.cardano];
  readonly project = ProjectEnum.muesliswap;
  readonly displayName = 'MuesliSwap';
  readonly name = ProtocolNameEnum.muesliswap;
  readonly features = {
    [ChainAbbrEnum.cardano]: [FeatureEnum.staking],
  };

  protected dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly stakingService: MuesliSwapStaking,
  ) {
    super();
    this.dataProvider = this;
  }

  private getFeatureData(addresses: Address[], chain: ChainDto, feature: FeatureEnum) {
    switch (feature) {
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
