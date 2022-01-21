import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainDto, FeatureEnum, Logger } from '@app/common';
import { ChainAbbrEnum, ProjectEnum, DefiKingdomsProtocolEnum } from '@app/common/enum';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import BasicProtocol from '../basicProtocol';
import { DefiKingdomsStaking } from './defikingdoms.staking';
import { DefiKingdomsPools } from './defikingdoms.pools';
import { DefiKingdomsLocked } from './defikingdoms.locked';

@Injectable()
export default class DefiKingdomsProtocol extends BasicProtocol {
  readonly chains = [ChainAbbrEnum.harm];
  readonly project = ProjectEnum.defikingdoms;
  readonly name = DefiKingdomsProtocolEnum.defikingdoms;
  readonly displayName = 'DefiKingdoms';
  readonly features = {
    [ChainAbbrEnum.harm]: [
      FeatureEnum.staking, 
      FeatureEnum.pools, 
      FeatureEnum.lockedBalances,
    ],
  };
  
  protected readonly dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    private readonly staking: DefiKingdomsStaking,
    private readonly pools: DefiKingdomsPools,
    private readonly locked: DefiKingdomsLocked,
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
      case FeatureEnum.staking:
        return this.staking.getData(addresses, chain);
      case FeatureEnum.pools:
        return this.pools.getData(addresses, chain);
      case FeatureEnum.lockedBalances:
        return this.locked.getData(addresses, chain);
      default:
        return [];
    }
  }
}
