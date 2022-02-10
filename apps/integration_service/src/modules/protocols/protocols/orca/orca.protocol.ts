import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger, ProtocolNameEnum } from '@app/common';
import { ChainAbbrEnum, ProjectEnum } from '@app/common/enum';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { keepSolAddresses } from '@app/common/utils';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { Mapper } from '../../helpers/mappers/mapper';
import DataProviderProtocol from '../dataProviderProtocol';
import { OrcaFarms } from './orca.farms';
import { OrcaPools } from './orca.pools';

@Injectable()
export default class OrcaProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.sol];
  readonly project = ProjectEnum.orca;
  readonly name = ProtocolNameEnum.orca;
  readonly displayName = ProtocolNameEnum.orca;
  readonly features = {
    [ChainAbbrEnum.sol]: [FeatureEnum.pools, FeatureEnum.farming],
  };
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly mapper: Mapper,
    private readonly pools: OrcaPools,
    private readonly farming: OrcaFarms,
  ) {
    super();
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const keepAddresses = keepSolAddresses(addresses);
    const chainFeatures = await Promise.allSettled(
      this.features[chain.abbr].map((f) => {
        return this.getFeatureData(keepAddresses, chain, f);
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
      case FeatureEnum.farming:
        return this.farming.getData(addresses, chain);
      default:
        return [];
    }
  }
}
