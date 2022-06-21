import { AssetService } from 'apps/integration/src/modules/microservices/asset.service';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IProtocolMeta } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
  IRewardTokenUserEntry,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

type IStakedGMXTokenMinimal = BaseWithTokens<ISupplyTokenMinimal, IRewardTokenMinimal[]>;
type IStakedGMXTokenPool = BaseWithTokens<ISupplyTokenOpportunity, IRewardTokenOpportunity[]>;
type IStakedGMXTokenUserEntry = BaseWithTokens<ISupplyTokenUserEntry, IRewardTokenUserEntry[]>;
export interface IStakedGMXMeta extends IProtocolMeta {
  token: Address;
  address: Address;
  rewardContract: Address;
}

/**
 * 'Flipped' masterchef. deposit the same token into
 * every pool, but get a different reward from each
 */
export class StakedGMX extends SingleContractProtocol<
  IStakedGMXTokenMinimal,
  IStakedGMXTokenPool,
  IStakedGMXTokenUserEntry,
  IStakedGMXMeta
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

  protected functionPredicates = {
    balanceOf: () => (item) => item.name === 'balanceOf',
    rewardToken: () => (item) => item.name === 'rewardToken',
    claimable: () => (item) => item.name === 'claimable',
  };

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakedGMXTokenMinimal[]> {
    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supply: {
          token: { address: context.stakedToken },
          totalSupplied: context.totalSupply.toString(),
        },
        rewarded: [
          {
            token: { address: context.stakedToken },
          },
        ],
      },
    ];
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakedGMXTokenPool[],
  ): Promise<IStakedGMXTokenUserEntry[]> {
    //
  }
}
