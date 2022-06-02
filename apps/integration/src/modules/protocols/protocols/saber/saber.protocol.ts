import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger, ProtocolNameEnum } from '@app/common';
import { ChainAbbrEnum, ProjectEnum } from '@app/common/enum';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { LiquidityPools } from '../../features/liquidity-pools';
import { Mapper } from '../../helpers/mappers/mapper';
import DataProviderProtocol from '../dataProviderProtocol';

@Injectable()
export default class SaberProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.sol];
  readonly project = ProjectEnum.saber;
  readonly name = ProtocolNameEnum.saber;
  readonly displayName = ProtocolNameEnum.saber;
  readonly features = {
    [ChainAbbrEnum.sol]: [FeatureEnum.pools],
  };
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly mapper: Mapper,
    private readonly pools: LiquidityPools,
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
