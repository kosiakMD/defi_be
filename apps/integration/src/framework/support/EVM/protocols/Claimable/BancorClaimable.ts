// eslint-disable-next-line max-classes-per-file
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { dataFrom, normalizeDecimals } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { FakeAssetService } from '../../../../../modules/microservices/fake.asset.service';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
} from '../../../interfaces/feature.staking.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ITokenUserEntry } from '../../../interfaces/tokens.common.interface';
import { ISupplyTokenUserEntry } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export interface IBancorClaimableMeta extends IProtocolMeta {
  address: Address;
  reward: Address;
}

export type IStakingFeatureUserEntry = BaseWithTokens<
  ISupplyTokenUserEntry[],
  ITokenUserEntry[],
  void,
  any
>;

export class BancorClaimable
  extends SingleContractProtocol<
    IStakingFeatureMinimal,
    IStakingFeatureOpportunity,
    IStakingFeatureUserEntry,
    IBancorClaimableMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: FakeAssetService,
    protected httpService: HttpService,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    pendingRewards: () => (item) => item.name === 'pendingRewards',
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected fetchOpportunityData(context): Promise<IStakingFeatureMinimal[]> {
    return Promise.resolve([
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: FeatureEnum.claimable,
        supplied: [],
        rewarded: [
          {
            token: {
              address: this.meta.reward,
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
    const calls = new Map<string, CallData>();
    calls.set(
      Labels.pendingRewards(this.meta.address, address),
      plainToClass(CallData, {
        address: this.meta.address,
        abi: this.functions.pendingRewards,
        input: {
          data: [address],
        },
      }),
    );
    const claimableData = await this.multicall.handleInBatches(calls, this.meta.chain);
    return pools.reduce((positions, pool) => {
      const pendingReward: BN = dataFrom(
        claimableData,
        Labels.pendingRewards(this.meta.address, address),
      );
      if (pendingReward.isZero()) {
        return positions;
      }
      const userPosition: IStakingFeatureUserEntry = {
        feature: pool.feature,
        id: pool.id,
        chain: pool.chain,
        links: pool.links,
        supplied: [],
        rewarded: pool.rewarded.map((rt) => {
          const amount = normalizeDecimals(pendingReward, rt.token.decimals);
          return {
            token: rt.token,
            amount: amount,
            value: amount * rt.token.price,
          };
        }),
      };
      return [...positions, userPosition];
    }, []);
  }
}

export class Labels {
  static pendingRewards(contractAddress: string, accountAddress: string) {
    return `${contractAddress}_pendingRewards(${accountAddress})`;
  }
}
