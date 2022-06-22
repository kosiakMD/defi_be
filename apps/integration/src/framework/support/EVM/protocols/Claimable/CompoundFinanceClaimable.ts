import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
import { Cache } from 'cache-manager';
import { startsWith } from 'lodash';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { FeatureEnum } from '../../../enums';
import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export type IFeatureEntryMinimal = BaseWithTokens<ISupplyTokenMinimal>;
export type IFeatureOpportunity = BaseWithTokens<ISupplyTokenOpportunity>;
export type IFeatureUserEntry = BaseWithTokens<ISupplyTokenUserEntry>;

export interface ICompoundFinanceClaimableMeta extends IProtocolMeta {
  feature: FeatureEnum.claimable;
  name: string;
  address: Address;
  context: {
    controller: Address;
    rewardToken: Address;
  };
}

export class CompoundFinanceClaimable extends SingleContractProtocol<
  IFeatureEntryMinimal,
  IFeatureOpportunity,
  IFeatureUserEntry,
  ICompoundFinanceClaimableMeta
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: AssetService,
  ) {
    super();
  }

  protected functionPredicates: INamedFunctionPredicates = {
    pendingRewards: () => (item) => startsWith(item.name, 'getCompBalance'),
  };

  protected async fetchOpportunityData(
    context: Record<string, any>,
  ): Promise<IFeatureEntryMinimal[]> {}

  protected fetchOpportunityData(context: { [key: string]: any }): Promise<IFeatureEntryMinimal[]> {
    throw new Error('Method not implemented.');
  }
  protected fetchUserData(
    address: string,
    pools: IFeatureOpportunity[],
  ): Promise<IFeatureUserEntry[]> {
    throw new Error('Method not implemented.');
  }
}
