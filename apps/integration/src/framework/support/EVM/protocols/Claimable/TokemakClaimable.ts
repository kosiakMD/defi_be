import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetService } from '../../../../../modules/microservices/asset.service';
import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';
import { TokemakRewardHash } from '../../contracts/TokemakRewardHash';

export interface ITokemakClaimableMeta extends IProtocolMeta {
  address: Address;
  rewardHash: Address;
  rewardToken: Address;
  ipfsGateway: string;
}

export class TokemakClaimable extends SingleContractProtocol<
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
  ITokemakClaimableMeta
> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: AssetService,
    protected httpService: HttpService,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    getClaimableAmount: () => (item) => item.name === 'getClaimableAmount',
  };

  protected fetchOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    return Promise.resolve([
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: FeatureEnum.claimable,
        supplied: [],
        rewarded: [
          {
            token: {
              address: this.meta.rewardToken,
            },
          },
        ],
      },
    ]);
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const latestClaimable = await this.getOrSetLatestClaimable();

    const url = this.getIpfsUrl(latestClaimable, address);
    const {
      data: { payload },
    } = await firstValueFrom(this.httpService.get(url));

    const contract = this.getMainContract();

    let reward = await this.multicall.call(
      contract.createCall(this.functions.getClaimableAmount, payload),
      this.meta.chain,
    );
    reward = normalizeDecimals(reward, pools[0].rewarded[0].token.decimals);

    Object.assign(pools[0].rewarded[0], {
      amount: reward,
      value: reward * pools[0].rewarded[0].token.price,
    });

    return pools as IStakingFeatureUserEntry[];
  }

  private async getOrSetLatestClaimable(): Promise<string> {
    return this.getOrSet(
      60 * 60 * 3,
      `${this.meta.chain}-${this.meta.address}-latest-claimable`,
      async () => {
        return await this.getLatestClaimable();
      },
    );
  }

  protected async getLatestClaimable(): Promise<string> {
    const RewardHash = new TokemakRewardHash(this.meta.rewardHash);

    const lastCycleIndex = await this.multicall.call(
      RewardHash.latestCycleIndex(),
      this.meta.chain,
    );

    const { latestClaimable } = await this.multicall.call(
      RewardHash.cycleHashes(lastCycleIndex),
      this.meta.chain,
    );

    return latestClaimable;
  }

  protected getIpfsUrl(latestClaimable: string, address: Address): string {
    return `${this.meta.ipfsGateway}/${latestClaimable}/${address}.json`;
  }
}
