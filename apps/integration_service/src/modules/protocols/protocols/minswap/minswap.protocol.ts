import { BaseData } from 'apps/integration_service/src/common/interfaces/transactions.interfaces';

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
import { keepCardanoAddresses } from '@app/common/utils/addresses';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import AbstractProtocol from '../abstractProtocol';
import DataProviderProtocol from '../dataProviderProtocol';
import { MinswapFarms } from './minswap.farms';
import { MinswapPools } from './minswap.pools';

@Injectable()
export default class MinswapProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.cardano];
  readonly project = ProjectEnum.minswap;
  readonly displayName = 'Minswap';
  readonly name = ProtocolNameEnum.minswap;
  readonly features = {
    [ChainAbbrEnum.cardano]: [FeatureEnum.pools, FeatureEnum.staking],
  };

  protected dataProvider;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly poolService: MinswapPools,
    protected readonly farmService: MinswapFarms,
  ) {
    super();
    this.dataProvider = this;
  }

  private getFeatureData(addresses: Address[], chain: ChainDto, feature: FeatureEnum) {
    switch (feature) {
      case FeatureEnum.pools:
        return this.poolService.getData(addresses, chain, this.name);
      case FeatureEnum.staking:
        return this.farmService.getData(addresses, chain, this.name);
      default:
        return [];
    }
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    addresses = keepCardanoAddresses(addresses);
    const features = this.features[chain.abbr].map((feature: FeatureEnum) =>
      this.getFeatureData(addresses, chain, feature),
    );

    const chainFeatures = await Promise.allSettled(features);

    const [data, errors] = handlePromiseAllSettled(chainFeatures);
    return [data.flat(), errors];
  }
}
