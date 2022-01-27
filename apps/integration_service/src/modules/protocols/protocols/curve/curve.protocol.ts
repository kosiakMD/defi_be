import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, CurveProtocolEnum, FeatureEnum, Logger } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { ChainAbbrEnum, ProjectEnum } from '@app/common/enum';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import BasicProtocol from '../basicProtocol';
import { CurvePools } from './curve.pools';
import { CurveStaking } from './curve.staking';

@Injectable()
export default class CurveProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.plg, ChainAbbrEnum.ftm, ChainAbbrEnum.avax];
  readonly project = ProjectEnum.curve;
  readonly name = CurveProtocolEnum.curve;
  readonly displayName = 'Curve';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools, FeatureEnum.staking],
    [ChainAbbrEnum.plg]: [FeatureEnum.pools, FeatureEnum.staking],
    [ChainAbbrEnum.ftm]: [FeatureEnum.pools, FeatureEnum.staking],
    [ChainAbbrEnum.avax]: [FeatureEnum.pools, FeatureEnum.staking],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly pools: CurvePools,
    private readonly staking: CurveStaking,
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
      default:
        return [];
    }
  }
}
