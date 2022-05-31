import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  FeatureEnum,
  Logger,
  ProjectEnum,
  VVSProtocolEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { AccountService } from '../../../microservice/account.service';
import { PriceService } from '../../../microservice/price.service';
import { PancakeSubgraph } from '../../../subgraph/subgraphs/pancake.subgraph';
import { Mapper } from '../../helpers/mappers/mapper';
import DataProviderProtocol from '../data-provider-protocol';
import { VVSPools } from './vvs.pools';
import { VVSStaking } from './vvs.staking';

@Injectable()
export class VVSProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.cro];
  readonly project = ProjectEnum.vvs;
  readonly name = VVSProtocolEnum.vvs;
  readonly displayName = 'VVS';
  readonly features = {
    [ChainAbbrEnum.cro]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  public feeRate = 0.003;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: PancakeSubgraph,
    protected readonly mapper: Mapper,
    private readonly vvsPools: VVSPools,
    private readonly vvsStaking: VVSStaking,
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
        return this.vvsStaking.getData(addresses, chain);
      case FeatureEnum.pools:
        return this.vvsPools.getData(addresses, chain);
      default:
        return [];
    }
  }
}
