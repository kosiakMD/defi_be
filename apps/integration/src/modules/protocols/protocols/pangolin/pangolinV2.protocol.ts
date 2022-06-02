import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  PangolinProtocolEnum,
  ProjectEnum,
} from '@app/common';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { Mapper } from '../../helpers/mappers/mapper';
import BasicProtocol from '../basicProtocol';
import { PangolinPools } from './pangolin.pools';
import { PangolinStaking } from './pangolin.staking';

export class PangolinV2Protocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.avax];
  readonly displayName = PangolinProtocolEnum.pangolin;
  readonly features = {
    [ChainAbbrEnum.avax]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  readonly name = PangolinProtocolEnum.pangolin;
  readonly project = ProjectEnum.pangolin;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly mapper: Mapper,
    private readonly staking: PangolinStaking,
    private readonly pools: PangolinPools,
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
