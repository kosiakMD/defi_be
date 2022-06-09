// import { MuesliSwapAssetService } from 'apps/integration/src/modules/microservices/muesliswap.asset.service';
// import { Cache } from 'cache-manager';
// import { firstValueFrom, map } from 'rxjs';

// import { HttpService } from '@nestjs/axios';
// import { CACHE_MANAGER, Inject } from '@nestjs/common';
// import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

// import { Logger } from '@app/common';
// import { stringToHex } from '@app/common/utils';

// import { CardanoService } from '../../../../../modules/protocols/helpers/cardano/cardano.service';
// import { IProtocolMeta } from '../../../interfaces';
// import { BaseWithTokens } from '../../../interfaces/new.interfaces';
// import {
//   IRewardTokenMinimal,
//   IRewardTokenOpportunity,
//   IRewardTokenUserEntry,
// } from '../../../interfaces/tokens.rewarded.interface';
// import {
//   ISupplyTokenMinimal,
//   ISupplyTokenOpportunity,
//   ISupplyTokenUserEntry,
// } from '../../../interfaces/tokens.supplied.interface';
// import { CardanoCore } from '../../CardanoCore';
// import { FARM_POOL_INFO } from '../../Subgraphs/MinswapSubgraph';

// interface IMilkPoolExtra {
//   endDate: string; // "2022-04-01T12:00:00+00:00"
//   tokensLeft: number;
//   poolSize: number;
// }

// export type IFeatureEntryMinimal = BaseWithTokens<
//   ISupplyTokenMinimal,
//   IRewardTokenMinimal,
//   void,
//   IMilkPoolExtra
// >;
// export type IFeatureOpportunity = BaseWithTokens<
//   ISupplyTokenOpportunity,
//   IRewardTokenOpportunity,
//   void,
//   IMilkPoolExtra
// >;
// export type IFeatureUserEntry = BaseWithTokens<
//   ISupplyTokenUserEntry,
//   IRewardTokenUserEntry,
//   void,
//   IMilkPoolExtra
// >;

// export interface IMinSwapPoolsMeta extends IProtocolMeta {
//   context?: any;
// }

// export class MuesliSwapMilkPools extends CardanoCore<
//   IFeatureEntryMinimal,
//   IFeatureOpportunity,
//   IFeatureUserEntry,
//   IMinSwapPoolsMeta
// > {
//   constructor(
//     @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
//     @Inject(CACHE_MANAGER) protected cache: Cache,
//     protected assetService: MuesliSwapAssetService,
//     protected httpService: HttpService,
//     private readonly cardanoUtils: CardanoService,
//   ) {
//     super();
//   }

//   async getCacheableOpportunityData(): Promise<IFeatureEntryMinimal[]> {
//     const pools = await this.fetchMilkPools();

//     return pools.map(this.milkPoolToMinimalFeature.bind(this));
//   }

//   protected async fetchUserData(
//     address: string,
//     pools: IFeatureOpportunity[],
//   ): Promise<IFeatureUserEntry[]> {
//     const data = await this.fetchStakingRewards(address);
//     const poolMap = new Map(pools.map((p) => [p.id, p]));

//     return data.map((stakingData) => {
//       const pool = poolMap.get(stakingData.pool_id);
//       if (!pool) {
//         // pool filtered out, likely missing tokens
//         return null;
//       }

//       return {
//         ...pool,
//         supply: {
//           ...pool.supply,
//           amount: stakingData.amount_staked,
//           value: pool.supply.token.price * stakingData.amount_staked,
//         },
//         reward: {
//           ...pool.reward,
//           amount: stakingData.reward,
//           value: pool.reward.token.price * stakingData.reward,
//         },
//       };
//     });
//   }

//   protected getHarvestBreakdown(): { apr: null; apy: null } {
//     return { apr: null, apy: null };
//   }

//   protected getYieldBreakdown(): { apr: null; apy: null } {
//     return { apr: null, apy: null };
//   }

//   /**
//    *
//    * @returns
//    */
//   private async fetchMilkPools(): Promise<IMuesliSwapStakingPool[]> {
//     return this.get(`https://staking.muesliswap.com/tokens-info`);
//   }

//   private async fetchStakingRewards(address: string): Promise<IMuesliSwapStakingRewards[]> {
//     return this.get(`https://staking.muesliswap.com/my-rewards`, {
//       pkh: this.cardanoUtils.addressToBlake224(address),
//     });
//   }

//   /**
//    * Formats basic HTTP result milk pool to FeatureMinimal
//    */
//   private milkPoolToMinimalFeature(pool: IMuesliSwapStakingPool): IFeatureEntryMinimal {
//     return {
//       id: pool.poolId,
//       chain: this.meta.chain,
//       feature: this.meta.feature,
//       supply: {
//         token: {
//           address: this.toTokenId(pool.stakingPolicyId, pool.stakingName),
//         },
//         totalSupplied: pool.amountStaked,
//       },
//       reward: {
//         token: {
//           address: this.toTokenId(pool.rewardPolicyId, pool.rewardName),
//         },
//       },
//       meta: {
//         endDate: pool.poolEndTime,
//         tokensLeft: pool.tokensLeft,
//         poolSize: pool.poolSize,
//       },
//     };
//   }

//   private toTokenId(policyId: string, symbol: string) {
//     return `${policyId}.${stringToHex(symbol)}`;
//   }

//   private get<T>(url: string, params?: { [key: string]: unknown }): Promise<T> {
//     return firstValueFrom(this.httpService.get(url, { params }).pipe(map(({ data }) => data)));
//   }
// }
