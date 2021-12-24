import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger } from '@app/common';
import { ChainAbbrEnum, PancakeProtocolEnum, ProjectEnum } from '@app/common/enum';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { PancakeSubgraph } from '../../../subgraphs/subgraphs/pancake.subgraph';
import { LiquidityPools } from '../../features/liquidity-pools';
import { Mapper } from '../../helpers/mappers/mapper';
import DataProviderProtocol from '../dataProviderProtocol';
import { PancakeV2Legacy } from './pancake-v2.legacy';
import { PancakeV2Staking } from './pancake-v2.staking';
import { keepETHAddresses } from '@app/common/utils';

@Injectable()
export default class PancakeProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.bsc];
  readonly project = ProjectEnum.pancake;
  readonly name = PancakeProtocolEnum.pancakeV2;
  readonly displayName = 'Pancake V2';
  readonly features = {
    [ChainAbbrEnum.bsc]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  public static feeRate = 0.0025;
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: PancakeSubgraph,
    protected readonly mapper: Mapper,
    private readonly staking: PancakeV2Staking,
    private readonly pancakeV2Legacy: PancakeV2Legacy,
    private readonly pools: LiquidityPools,
  ) {
    super();

    this.dataProvider = pancakeV2Legacy;
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    addresses = keepETHAddresses(addresses);
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
        this.logger.error(r.reason, r.reason.stack, PancakeProtocol.name);
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
      case FeatureEnum.staking:
        return this.staking.getData(addresses, chain);
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
