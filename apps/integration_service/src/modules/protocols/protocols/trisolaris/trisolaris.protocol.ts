import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  TrisolarisProtocolEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { PancakeSubgraph } from '../../../subgraphs/subgraphs/pancake.subgraph';
import { Mapper } from '../../helpers/mappers/mapper';
import DataProviderProtocol from '../data-provider-protocol';
import { TrisolarisPools } from './trisolaris.pools';
import { TrisolarisStaking } from './trisolaris.staking';

@Injectable()
export class TrisolarisProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.near];
  readonly project = ProjectEnum.trisolaris;
  readonly name = TrisolarisProtocolEnum.trisolaris;
  readonly displayName = 'Trisolaris';
  readonly features = {
    [ChainAbbrEnum.near]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: PancakeSubgraph,
    protected readonly mapper: Mapper,
    private readonly pools: TrisolarisPools,
    private readonly staking: TrisolarisStaking,
  ) {
    super();

    this.dataProvider = this;
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
