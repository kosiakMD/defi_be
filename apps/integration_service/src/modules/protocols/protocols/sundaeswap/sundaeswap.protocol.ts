import { BaseData } from 'apps/integration_service/src/common/interfaces/transactions.interfaces';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  SundaeProtocolEnum,
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
import { SundaeSwapFarms } from './sundaeswap.farms';
import { SundaeSwapPools } from './sundaeswap.pools';

@Injectable()
export class SundaeSwapProtocol extends DataProviderProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.cardano];
  readonly project = ProjectEnum.sundaeswap;
  readonly displayName = 'SundaeSwap';
  readonly name = SundaeProtocolEnum.sundaeswap;
  readonly features = {
    [ChainAbbrEnum.cardano]: [FeatureEnum.pools, FeatureEnum.staking],
  };

  protected dataProvider;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly poolService: SundaeSwapPools,
    private readonly farmService: SundaeSwapFarms,
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
    const chainFeatures = await Promise.allSettled(
      this.features[chain.abbr].map((f) => {
        return this.getFeatureData(addresses, chain, f);
      }),
    );

    const [data, errors] = handlePromiseAllSettled(chainFeatures);
    return [data.flat(), errors];
  }
}

export default SundaeSwapProtocol;
