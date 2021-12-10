import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger } from '@app/common';
import { ChainAbbrEnum, PumpkinsProtocolEnum, ProjectEnum } from '@app/common/enum';
import { PumpkinsStaking } from './pumpkins.staking';
import { LiquidityPools } from '../features/liquidity-pools';

import { BaseData } from '../../../interfaces/transactions.interfaces';
import BasicProtocol from '../basicProtocol';


@Injectable()
export default class PumpkinsProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.ftm];
  readonly project = ProjectEnum.pumpkins;
  readonly name = PumpkinsProtocolEnum.pumpkins;
  readonly displayName = 'Pumpkins Farm';
  readonly features = {
    [ChainAbbrEnum.ftm]: [FeatureEnum.staking, FeatureEnum.pools],
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly staking: PumpkinsStaking,
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

    const data = [];
    const errors = [];
    chainFeatures.forEach((r) => {
      if (r.status === 'fulfilled') {
        data.push(r.value);
      } else {
        this.logger.error(r.reason, r.reason.stack, PumpkinsProtocol.name);
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