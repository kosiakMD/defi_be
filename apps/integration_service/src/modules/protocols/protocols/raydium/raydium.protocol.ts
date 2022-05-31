import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger, ProtocolNameEnum } from '@app/common';
import { ChainAbbrEnum, ProjectEnum } from '@app/common/enum';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { LiquidityPools } from '../../features/liquidity-pools';
import { Mapper } from '../../helpers/mappers/mapper';
import DataProviderProtocol from '../dataProviderProtocol';
import { RaydiumStaking } from './raydium.staking';

@Injectable()
export default class RaydiumProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.sol];
  readonly project = ProjectEnum.raydium;
  readonly name = ProtocolNameEnum.raydium;
  readonly displayName = ProtocolNameEnum.raydium;
  readonly features = {
    [ChainAbbrEnum.sol]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly mapper: Mapper,
    private readonly pools: LiquidityPools,
    private readonly staking: RaydiumStaking,
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
        this.logger.error(r.reason, r.reason.stack, RaydiumProtocol.name);
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
      case FeatureEnum.staking:
        return this.staking.getData(addresses, chain);
      default:
        return [];
    }
  }
}
