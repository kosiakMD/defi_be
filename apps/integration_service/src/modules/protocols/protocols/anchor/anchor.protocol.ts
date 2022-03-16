import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AnchorProtocolEnum,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import BasicProtocol from '../basicProtocol';
import { AnchorLending } from './anchor.lending';
import { AnchorPools } from './anchor.pools';
import { AnchorStaking } from './anchor.staking';

@Injectable()
export class AnchorProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.terra];
  readonly project = ProjectEnum.anchor;
  readonly name = AnchorProtocolEnum.anchor;
  readonly displayName = 'Anchor';
  readonly features = {
    [ChainAbbrEnum.terra]: [
      FeatureEnum.pools,
      FeatureEnum.staking,
      FeatureEnum.lending,
      FeatureEnum.borrowing,
    ],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly pools: AnchorPools,
    private readonly staking: AnchorStaking,
    private readonly lending: AnchorLending,
  ) {
    super();
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

  public async getFeatureData(
    addresses: Address[],
    chain: ChainDto,
    feature: FeatureEnum,
  ): Promise<BaseData[]> {
    switch (feature) {
      case FeatureEnum.staking:
        return this.staking.getData(addresses, chain);
      case FeatureEnum.pools:
        return this.pools.getData(addresses, chain);
      case FeatureEnum.lending:
        return this.lending.getData(addresses, chain);
      default:
        return [];
    }
  }
}
