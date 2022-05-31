import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, EllipsisProtocolEnum, FeatureEnum, Logger } from '@app/common';
import { ChainAbbrEnum, ProjectEnum } from '@app/common/enum';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservice/account.service';
import { PriceService } from '../../../microservice/price.service';
import { Mapper } from '../../helpers/mappers/mapper';
import DataProviderProtocol from '../data-provider-protocol';
import { EllipsisPools } from './ellipsis.pools';
import { EllipsisStaking } from './ellipsis.staking';

@Injectable()
export default class EllipsisProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.bnb];
  readonly project = ProjectEnum.ellipsis;
  readonly name = EllipsisProtocolEnum.ellipsis;
  readonly displayName = 'Ellipsis';
  readonly features = {
    [ChainAbbrEnum.bnb]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  public static feeRate = 0.0025;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly mapper: Mapper,
    private readonly staking: EllipsisStaking,
    private readonly pools: EllipsisPools,
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

    const data = [];
    const errors = [];
    chainFeatures.forEach((r) => {
      if (r.status === 'fulfilled') {
        data.push(r.value);
      } else {
        this.logger.error(r.reason, r.reason.stack, EllipsisProtocol.name);
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
      // todo: add staking
      case FeatureEnum.staking:
        return this.staking.getData(addresses, chain);
      case FeatureEnum.pools:
        return this.pools.getData(addresses, chain);
      default:
        return [];
    }
  }
}
