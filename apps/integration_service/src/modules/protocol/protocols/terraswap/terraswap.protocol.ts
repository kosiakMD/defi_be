import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  TerraswapProtocolEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservice/account.service';
import { PriceService } from '../../../microservice/price.service';
import BasicProtocol from '../basic-protocol';
import { TerraswapPools } from './terraswap.pools';

@Injectable()
export class TerraswapProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.terra];
  readonly project = ProjectEnum.terraswap;
  readonly name = TerraswapProtocolEnum.terraswap;
  readonly displayName = 'Terraswap';
  readonly features = {
    [ChainAbbrEnum.terra]: [FeatureEnum.pools],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly pools: TerraswapPools,
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
      case FeatureEnum.pools:
        return this.pools.getData(addresses, chain);
      default:
        return [];
    }
  }
}
