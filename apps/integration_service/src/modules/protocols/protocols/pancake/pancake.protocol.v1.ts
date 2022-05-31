import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger } from '@app/common';
import { BaseData } from '@app/common/dto/base-data';
import { ChainAbbrEnum, PancakeProtocolEnum, ProjectEnum } from '@app/common/enum';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { PancakeSubgraph } from '../../../subgraphs/subgraphs/pancake.subgraph';
import { LiquidityPools } from '../../features/liquidity-pools';
import { Mapper } from '../../helpers/mappers/mapper';
import DataProviderProtocol from '../data-provider-protocol';

@Injectable()
export default class PancakeProtocolV1 extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.bnb];
  readonly project = ProjectEnum.pancake;
  readonly name = PancakeProtocolEnum.pancakeV1;
  readonly displayName = 'Pancake V1';
  readonly features = {
    [ChainAbbrEnum.bnb]: [FeatureEnum.pools],
  };
  public feeRate = 0.003;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: PancakeSubgraph,
    protected readonly mapper: Mapper,
    private readonly pools: LiquidityPools,
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

    const data = [];
    const errors = [];
    chainFeatures.forEach((r) => {
      if (r.status === 'fulfilled') {
        data.push(r.value);
      } else {
        this.logger.error(r.reason, r.reason.stack, PancakeProtocolV1.name);
        errors.push(r.reason.toString());
      }
    });
    return [data.flat(), errors];
  }

  public async getFeatureData(
    addresses: Address[],
    chain: ChainDto,
    feature: FeatureEnum,
  ): Promise<BaseData[]> {
    switch (feature) {
      case FeatureEnum.pools:
        return this.pools.getData({
          addresses: addresses,
          protocolName: this.name,
          projectName: this.project,
          chain: chain,
        });
      default:
        return [];
    }
  }
}
