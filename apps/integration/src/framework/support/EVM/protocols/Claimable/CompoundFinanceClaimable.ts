import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
import { CompoundLens } from 'apps/integration/src/modules/protocols/protocols/compound/contracts/CompoundLens';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
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

  protected functionPredicates: INamedFunctionPredicates = {};
  protected interactiveFunctionPredicates: INamedFunctionPredicates = {
    pendingRewards: () => (item) => item.name === 'getCompBalanceMetadataExt',
  };

  protected async fetchOpportunityData(): Promise<IFeatureEntryMinimal[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supply: {
          token: {
            address: this.meta.context.rewardToken,
          },
          totalSupplied: '0',
        },
      },
    ];
  }

  protected async fetchUserData(
    address: string,
    pools: IFeatureOpportunity[],
  ): Promise<IFeatureUserEntry[]> {
    const contract = this.getMainContract();
    // const contract = new CompoundLens(this.meta.address);
    const pendingRewardsCall = contract.createCall(
      this.interactiveFunctions.pendingRewards,
      this.meta.context.rewardToken,
      this.meta.context.controller,
      address,
    );

    const pendingRewards = await this.multicall.call(pendingRewardsCall, this.meta.chain);

    return pools.reduce((pools, pool) => {
      const userPool = this.formatUserData(pool, pendingRewards);
      if (userPool) {
        pools.push(userPool);
      }

      return pools;
    }, []);
  }

  protected formatUserData(pool: IFeatureOpportunity, data: any): IFeatureUserEntry {
    const rewardBalance = normalizeDecimals(data[3], pool.supply.token.decimals);
    if (!rewardBalance) return;

    return {
      ...pool,
      supply: {
        ...pool.supply,
        amount: rewardBalance,
        value: rewardBalance * pool.supply.token.price,
      },
    };
  }
}
