import { EllipsisAssetService } from 'apps/integration/src/modules/microservices/ellipsis.asset.service';
import { Cache } from 'cache-manager';
import { cloneDeep } from 'lodash';
import { AbiItem } from 'web3-utils';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CurveAddresses } from '@app/common/constant/curve.addresses';
import { CallData } from '@app/common/dto/CallData';
import { aprToApy, apyToApr, dataFrom, normalizeDecimals, startsWith } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { CurveProvider } from '@app/common/web3provider/contracts/protocols/curve/CurveProvider';
import { CurveRegistry } from '@app/common/web3provider/contracts/protocols/curve/CurveRegistry';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { RootProtocolCacheable } from '../../../RootProtocolCacheable';
import { CurveAssetsManager } from '../../../assets/curve.assets.manager';
import { FeatureEnum } from '../../../enums';
import { IProtocolMeta } from '../../../interfaces';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from '../../../interfaces/tokens.rewarded.interface';
import { ISupplyTokenMinimal } from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { additionalGaugeContractsMap } from './curve/additional.gauge.contracts';
import { CurveApi } from './curve/curve.api';

export interface ICurveStakingMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  context: {
    apyUrl: string;
    poolSubgraphDataUrl: string;
    additionalRewardsUrl?: string;
    factoryPoolsUrl?: string;
    rewardToken: string;
    gaugesUrl?: string;
    gaugeAbisMap?: Map<string, AbiItem[]>;
  };
}

export type CurveExtraData = {
  minter: string;
  id: number;
  name?: string;
  gauge?: string;
  api?: boolean;
};

type ICurveRewardTokenMinimal = IRewardTokenMinimal<{ apy: number }>;
type ICurveSupplyTokenMinimal = ISupplyTokenMinimal<{ apy: number }>;
export type ICurveStakingFeatureMinimal = BaseWithTokens<
  ICurveSupplyTokenMinimal[],
  ICurveRewardTokenMinimal[],
  void,
  CurveExtraData
>;

export class CurveStakingEth extends RootProtocolCacheable<
  ICurveStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
  ICurveStakingMeta
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: EllipsisAssetService,
    protected assetsManager: CurveAssetsManager,
    protected httpService: HttpService,
  ) {
    super();
  }

  private handleCrvAprPoolsNames(poolName: string) {
    switch (poolName) {
      case 'y':
        return 'iearn';
      case 'susd':
        return 'susdv2';
      case 'aeth':
        return 'ankreth';
      default:
        return poolName;
    }
  }

  protected formatStakingOpportunityMinimal(
    poolInfo: ICurveEthPoolInfo,
  ): ICurveStakingFeatureMinimal {
    return {
      id: `${poolInfo.gauge}::${poolInfo.poolId}`,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        {
          token: {
            address: poolInfo.lpToken,
          },
          extra: { apy: 0 },
          totalSupplied: poolInfo.totalSupplied,
        },
      ],
      rewarded: poolInfo.rewards.map((reward) => ({
        token: { address: reward.address },
        extra: { apy: reward.apy },
      })),
      meta: {
        id: poolInfo.poolId,
        minter: poolInfo.pool,
        name: poolInfo.name,
        gauge: poolInfo.gauge,
        api: poolInfo.api,
      },
    };
  }

  protected async getRewards(gaugeData: { gauge: string; lp: string }[]) {
    const abis = await Promise.all(
      gaugeData.map((item) => this.abiService.fetchAbi(item.gauge, this.meta.chain)),
    );

    this.meta.context.gaugeAbisMap = abis.reduce((map, abi, index) => {
      map.set(gaugeData[index].gauge, abi);
      return map;
    }, new Map());

    const calls = new Map();
    gaugeData.forEach((data) => {
      const abi = this.meta.context.gaugeAbisMap.get(data.gauge);
      const rewardTokensAbi = abi.find((item) => item.name === 'reward_tokens');
      const rewardedTokenAbi = abi.find((item) => item.name === 'rewarded_token');
      const gaugeContract = new DynamicContract(data.gauge);
      if (rewardedTokenAbi) {
        calls.set(
          `${data.gauge}.${data.lp}.rewardedToken`,
          gaugeContract.createCall(rewardedTokenAbi),
        );
        return;
      }

      if (rewardTokensAbi) {
        [0, 1, 2].forEach((index) =>
          calls.set(
            `${data.gauge}.${data.lp}.${index}`,
            gaugeContract.createCall(rewardTokensAbi, index),
          ),
        );
      }
    });

    try {
      const multicallResp = await this.multicall.handleInBatches(calls, this.meta.chain);
      return gaugeData.reduce((resp, data) => {
        const rewardedToken = multicallResp.get(`${data.gauge}.${data.lp}.rewardedToken`)?.output
          .data;
        const rewardTokens = new Set(
          [0, 1, 2]
            .map((index) =>
              multicallResp.get(`${data.gauge}.${data.lp}.${index}`)?.output.data.toLowerCase(),
            )
            .filter((token) => token && token !== ZERO_ADDRESS),
        );

        if (rewardedToken) rewardTokens.add(rewardedToken.toLowerCase());
        rewardTokens.add(this.meta.context.rewardToken);
        resp.set(`${data.gauge}.${data.lp}`, Array.from(rewardTokens));
        return resp;
      }, new Map());
    } catch (e) {
      this.logger.error(e, 'getGaugeRewardTokens');
    }
  }

  protected async updateRealTimeData(
    opportunities: ICurveStakingFeatureMinimal[],
  ): Promise<ICurveStakingFeatureMinimal[]> {
    const curveAPI = new CurveApi(this.httpService);
    const [poolsAPIData, { mainPoolsGaugeRewards }, { poolData }, poolsApyData] = await Promise.all(
      [
        curveAPI.getSubgraphPoolData(this.meta.context.poolSubgraphDataUrl),
        curveAPI.getMainPoolsGaugeRewardsData(this.meta.context.additionalRewardsUrl),
        curveAPI.getFactoryPoolsData(this.meta.context.factoryPoolsUrl),
        curveAPI.getCrvApysData(this.meta.context.apyUrl),
      ],
    );

    const mainPoolsGaugeRewardsMap = new Map(
      Object.entries(mainPoolsGaugeRewards).map(([key, value]) => [key.toLowerCase(), value]),
    );

    const gaugeRewardsMap = poolData
      .filter((pool) => pool.gaugeRewards?.length)
      .reduce((resp, value) => {
        resp.set(
          value.gaugeAddress.toLowerCase(),
          new Map(value.gaugeRewards.map((item) => [item.tokenAddress.toLowerCase(), item?.apy])),
        );
        return resp;
      }, new Map());

    const subgraphDataMap = poolsAPIData.poolList.reduce((resp, info) => {
      resp.set(info.address.toLowerCase(), info);
      return resp;
    }, new Map());

    return opportunities.map((opportunity) => {
      const subgraphData = subgraphDataMap.get(opportunity.meta.minter);
      opportunity.supplied[0].extra.apy = subgraphData.latestDailyApy;

      const mainPoolRewards = mainPoolsGaugeRewardsMap.get(opportunity.meta.gauge);
      const gaugePoolData = gaugeRewardsMap.get(opportunity.meta.gauge);

      opportunity.rewarded.forEach((reward) => {
        if (reward.token.address === this.meta.context.rewardToken) {
          reward.extra.apy =
            poolsApyData[this.handleCrvAprPoolsNames(opportunity.meta.name)]?.crvApy || 0;
          return;
        }
        if (mainPoolRewards) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          reward.extra.apy = mainPoolRewards.find(
            (item) => item.tokenAddress.toLowerCase() === reward.token.address,
          )?.apy;
          return;
        }
        reward.extra.apy = gaugePoolData?.get(reward.token.address) || 0;
      });
      return opportunity;
    });
  }

  protected formatSupplyApy?(supplied: ISupplyTokenMinimal<{ apy: number }>) {
    return {
      year: supplied.extra.apy,
    };
  }

  protected formatOpportunityRewardedToken(
    poolToken: IRewardTokenMinimal<{ apy: number }>,
    token: ERC20Token,
    tvl: number,
  ): IRewardTokenOpportunity {
    const { apr, apy } = getApyBreakdown(poolToken.extra.apy || 0);
    return {
      token,
      harvests: {
        day: (apr.day * tvl) / token.price,
        week: (apr.week * tvl) / token.price,
        month: (apr.month * tvl) / token.price,
        year: (apr.year * tvl) / token.price,
      },
      apr,
      apy,
    };
  }

  private async getGaugesInfos(
    contractAddresses: string[],
    poolsLength: any[],
    mainAddressAbis: AbiItem[][],
    poolsMap: Map<string, string[]>,
  ) {
    const abiMethodsMap = new Map(
      mainAddressAbis.map((abi, index) => [
        contractAddresses[index],
        {
          nameAbi: abi.find((item) => item.name === 'get_pool_name'),
          getTokenAbi: abi.find(
            (item) => item.name === 'get_lp_token' || item.name === 'get_token',
          ),
          getGaugeAbi: abi.find((item) => startsWith(item.name, 'get_gauge')),
        },
      ]),
    );

    const multicallResp = await this.multicall.handleInBatches(
      contractAddresses.reduce((resp, address, index) => {
        const contract = new DynamicContract(address);
        const poolIds = Array.from(Array(Number(poolsLength[index])).keys());
        const abiMethods = abiMethodsMap.get(address);
        const poolsContracts = poolsMap.get(address);
        poolIds.forEach((id) => {
          if (abiMethods.nameAbi) {
            resp.set(
              `${address}.${id}.name`,
              contract.createCall(abiMethods.nameAbi, poolsContracts[id]),
            );
          }
          resp.set(
            `${address}.${id}.gauge`,
            contract.createCall(abiMethods.getGaugeAbi, poolsContracts[id]),
          );
          if (abiMethods.getTokenAbi) {
            resp.set(
              `${address}.${id}.lp`,
              contract.createCall(abiMethods.getTokenAbi, poolsContracts[id]),
            );
          }
        });
        return resp;
      }, new Map()),
      this.meta.chain,
    );

    const gaugesInfo = contractAddresses.flatMap((address) => {
      const poolsContracts = poolsMap.get(address);
      return poolsContracts
        .map((pool, index) => {
          const item = multicallResp.get(`${address}.${index}.gauge`).output.data;
          // getGauge method for mainRegistry return an object with an array of gauges, for other contracts return just gauge address
          const gauge = typeof item === 'string' ? item.toLowerCase() : item['0'][0].toLowerCase();
          if (gauge === ZERO_ADDRESS) return;
          return {
            gauge,
            pool: pool.toLowerCase(),
            lpToken:
              multicallResp.get(`${address}.${index}.lp`)?.output.data.toLowerCase() ||
              pool.toLowerCase(),
            poolId: index,
            name: multicallResp.get(`${address}.${index}.name`)?.output.data,
          } as ICurveEthPoolInfo;
        })
        .filter((item) => item);
    });
    gaugesInfo.push(...(additionalGaugeContractsMap.get(this.meta.chain) || []));
    return gaugesInfo;
  }

  protected async fetchPoolInfos(contractAddresses: string[]): Promise<ICurveEthPoolInfo[]> {
    const poolsLength = await this.multicall.callArray(
      contractAddresses.map((address) => {
        const registry = new DynamicContract(address);
        return registry.createCall(CurveRegistry.poolCount);
      }),
      this.meta.chain,
    );

    const mainAddressAbis = await Promise.all(
      contractAddresses.map((address) => this.abiService.fetchAbi(address, this.meta.chain)),
    );

    const poolsMap = new Map();

    await Promise.all(
      contractAddresses.map(async (contractAddress, index) => {
        const contract = new DynamicContract(contractAddress);
        const poolIds = Array.from(Array(Number(poolsLength[index])).keys());
        const poolsContracts = await this.multicall.callArray(
          poolIds.map((poolId) => contract.createCall(CurveRegistry.poolList, poolId)),
          this.meta.chain,
        );
        poolsMap.set(contractAddress, poolsContracts);
      }),
    );

    // const abiMethodsMap = new Map(
    //   mainAddressAbis.map((abi, index) => [
    //     contractAddresses[index],
    //     {
    //       nameAbi: abi.find((item) => item.name === 'get_pool_name'),
    //       getTokenAbi: abi.find(
    //         (item) => item.name === 'get_lp_token' || item.name === 'get_token',
    //       ),
    //       getGaugeAbi: abi.find((item) => startsWith(item.name, 'get_gauge')),
    //     },
    //   ]),
    // );
    //
    // const multicallResp = await this.multicall.handleInBatches(
    //   contractAddresses.reduce((resp, address, index) => {
    //     const contract = new DynamicContract(address);
    //     const poolIds = Array.from(Array(Number(poolsLength[index])).keys());
    //     const abiMethods = abiMethodsMap.get(address);
    //     const poolsContracts = poolsMap.get(address);
    //     poolIds.forEach((id) => {
    //       if (abiMethods.nameAbi) {
    //         resp.set(
    //           `${address}.${id}.name`,
    //           contract.createCall(abiMethods.nameAbi, poolsContracts[id]),
    //         );
    //       }
    //       resp.set(
    //         `${address}.${id}.gauge`,
    //         contract.createCall(abiMethods.getGaugeAbi, poolsContracts[id]),
    //       );
    //       if (abiMethods.getTokenAbi) {
    //         resp.set(
    //           `${address}.${id}.lp`,
    //           contract.createCall(abiMethods.getTokenAbi, poolsContracts[id]),
    //         );
    //       }
    //     });
    //     return resp;
    //   }, new Map()),
    //   this.meta.chain,
    // );
    //
    // const gaugesInfo = contractAddresses.flatMap((address) => {
    //   const poolsContracts = poolsMap.get(address);
    //   return poolsContracts
    //     .map((pool, index) => {
    //       const item = multicallResp.get(`${address}.${index}.gauge`).output.data;
    //       // getGauge method for mainRegistry return an object with an array of gauges, for other contracts return just gauge address
    //       const gauge = typeof item === 'string' ? item.toLowerCase() : item['0'][0].toLowerCase();
    //       if (gauge === ZERO_ADDRESS) return;
    //       return {
    //         gauge,
    //         pool: pool.toLowerCase(),
    //         lpToken:
    //           multicallResp.get(`${address}.${index}.lp`)?.output.data.toLowerCase() ||
    //           pool.toLowerCase(),
    //         poolId: index,
    //         name: multicallResp.get(`${address}.${index}.name`)?.output.data,
    //       };
    //     })
    //     .filter((item) => item);
    // });
    const gaugesInfo = await this.getGaugesInfos(
      contractAddresses,
      poolsLength,
      mainAddressAbis,
      poolsMap,
    );

    const rewardsMap = await this.getRewards(
      gaugesInfo.map((item) => ({ gauge: item.gauge, lp: item.lpToken })),
    );

    const gaugesBalancesCalls = gaugesInfo.reduce((resp, info) => {
      const lpContract = new ERC20(info.lpToken);
      resp.set(`${info.gauge}.totalSupplied`, lpContract.balanceOf(info.gauge));
      return resp;
    }, new Map());

    const rewardsResp = await this.multicall.handleInBatches(gaugesBalancesCalls, this.meta.chain);
    const curveApiGauges = await this.getAdditionalGaugesFromApi();
    curveApiGauges.push(
      ...gaugesInfo.map((info) => {
        return {
          ...info,
          rewards: rewardsMap
            .get(`${info.gauge}.${info.lpToken}`)
            .map((item) => ({ address: item, apy: 0 })),
          totalSupplied: rewardsResp.get(`${info.gauge}.totalSupplied`).output.data.toString(),
        } as ICurveEthPoolInfo;
      }),
    );
    return curveApiGauges;
  }

  protected async getAdditionalGaugesFromApi() {
    return [];
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<any> {
    const calls = new Map();

    if (!this.meta.context.gaugeAbisMap) {
      const abis = await Promise.all(
        pools.map((pool) => {
          const gaugeAddress = pool.meta.gauge;
          return this.abiService.fetchAbi(gaugeAddress, this.meta.chain);
        }),
      );
      this.meta.context.gaugeAbisMap = pools.reduce((resp, pool, index) => {
        resp.set(pool.meta.gauge, abis[index]);
        return resp;
      }, new Map());
    }

    pools.map((pool) => {
      const contract = new DynamicContract(pool.meta.gauge);
      const gaugeAbi = this.meta.context.gaugeAbisMap.get(pool.meta.gauge);
      calls.set(
        balanceOfLabel(contract.address, address),
        contract.createCall(ERC20.balanceOf, address),
      );

      calls.set(
        claimableTokensLabel(contract.address, address),
        contract.createCall(claimableTokens, address),
      );

      if (pool.rewarded.length > 1) {
        const claimableRewardAbi = gaugeAbi.find((item) => item.name === 'claimable_reward');
        const claimedRewardsForAbi = gaugeAbi.find((item) => item.name === 'claimed_rewards_for');
        pool.rewarded.map(async (reward) => {
          if (reward.token.address === this.meta.context.rewardToken) return;
          if (claimedRewardsForAbi) {
            calls.set(
              claimableRewardLabel(pool.meta.gauge, address),
              contract.createCall(claimableRewardAbi, address),
            );

            calls.set(
              claimedRewardsForLabel(pool.meta.gauge, address),
              contract.createCall(claimedRewardsForAbi, address),
            );
          } else {
            calls.set(
              additionalClaimableRewardLabel(pool.meta.gauge, address, reward.token.address),
              contract.createCall(claimableRewardAbi, address, reward.token.address),
            );
          }
        });
      }
    });

    const userData = await this.multicall.handleInBatches(calls, this.meta.chain);
    return pools
      .map((p) => {
        return this.formatUserData(address, p, userData);
      })
      .filter((ub) => ub !== undefined);
  }

  protected formatUserRewardsData(
    address: Address,
    usersPool: IStakingFeatureOpportunity,
    data: Map<string, CallData>,
  ) {
    return usersPool.rewarded.map((reward) => {
      let amount;
      if (reward.token.address === this.meta.context.rewardToken) {
        const rawAmount = data.get(claimableTokensLabel(usersPool.meta.gauge, address)).output.data;
        amount = normalizeDecimals(rawAmount, reward.token.decimals);
      } else {
        const rawAmount =
          data.get(
            additionalClaimableRewardLabel(usersPool.meta.gauge, address, reward.token.address),
          )?.output.data ||
          data
            .get(claimableRewardLabel(usersPool.meta.gauge, address))
            ?.output.data.minus(
              data.get(claimedRewardsForLabel(usersPool.meta.gauge, address))?.output.data,
            );
        amount = normalizeDecimals(rawAmount, reward.token.decimals);
      }

      return {
        ...reward,
        amount,
        value: amount * reward.token.price,
      };
    });
  }

  protected formatUserData(
    address: Address,
    pool: IStakingFeatureOpportunity,
    data: Map<string, CallData>,
  ): IStakingFeatureUserEntry {
    const usersPool = cloneDeep(pool);
    const lpToken = usersPool.supplied[0];
    const userBalance = dataFrom(data, balanceOfLabel(pool.meta.gauge, address));

    if (userBalance.isZero()) {
      return;
    }
    const balanceNormalized = normalizeDecimals(userBalance.toString(), lpToken.token.decimals);

    const poolShare = balanceNormalized / lpToken.token.totalSupply;
    Object.assign(usersPool.supplied[0], {
      amount: balanceNormalized,
      value: balanceNormalized * lpToken.token.price,
    });

    usersPool.rewarded = this.formatUserRewardsData(address, usersPool, data);

    usersPool.supplied[0].token.underlying = usersPool.supplied[0].token.underlying.map((u) => {
      return this.formatUnderlyingTokens(u, poolShare);
    });

    return usersPool as IStakingFeatureUserEntry;
  }

  formatUnderlyingTokens(poolToken: ERC20Token, poolShare: number) {
    const balance = poolToken.reserve * poolShare;
    if (poolToken.underlying) {
      poolToken.underlying = poolToken.underlying.map((pt) => {
        const underlyingPoolShare = poolToken.balance / poolToken.totalSupply;
        return this.formatUnderlyingTokens(pt, underlyingPoolShare);
      });
    }
    return {
      ...poolToken,
      balance: balance,
      value: balance * poolToken.price,
    };
  }

  async getCacheableOpportunityData(): Promise<ICurveStakingFeatureMinimal[]> {
    const curveProvider = new DynamicContract(CurveAddresses.addressProvider);
    const registryAddresses = await this.multicall.callArray(
      [0, 3, 5, 6].map((value) => curveProvider.createCall(CurveProvider.getIdInfo, value)),
      this.meta.chain,
    );

    const poolInfos = await this.fetchPoolInfos(
      registryAddresses
        .map((registry) => registry.addr)
        .filter((registry, index) => {
          // abiService throws an error when receiving abi for metapoolFactory contract(gnosis chain)
          if (this.meta.chain === ChainIdEnum.gnosis && index === 1) return false;
          return registry !== ZERO_ADDRESS;
        }),
    );

    return poolInfos.map((pool) => this.formatStakingOpportunityMinimal(pool));
  }

  async getUsersData(
    addresses: Address[],
  ): Promise<{ data: Map<Address, IStakingFeatureUserEntry[]>; errors: Error[] }> {
    const { data: pools, errors } = await this.getPoolData();

    const results = new Map<Address, IStakingFeatureUserEntry[]>(
      addresses.map((address) => [address, [] as IStakingFeatureUserEntry[]]),
    );

    await Promise.allSettled(
      addresses.map(async (address) => {
        try {
          const userPools = await this.fetchUserData(address, pools);
          // An array of undefined values can be obtained
          const filteredPools = userPools.filter((data) => data);
          if (filteredPools.length) {
            results.get(address).push(...filteredPools);
          }
        } catch (err) {
          errors.push(err);
        }
      }),
    );

    return { data: results, errors };
  }

  protected getUniqueTokensFromRawPools(pools: ICurveStakingFeatureMinimal[]): Address[] {
    const tokens = new Set<string>();
    const multi = ['supplied', 'borrowed', 'rewarded'];
    pools.forEach((pool) => {
      multi.forEach((featureName) => {
        if (pool?.[featureName]?.length) {
          pool[featureName].forEach((item) => {
            tokens.add(item.token.address);
            if (item.token?.underlying) {
              item.token?.underlying.map((token) => tokens.add(token.address));
            }
          });
        }
      });
    });

    return Array.from(tokens);
  }
}

export interface ICurveEthPoolInfo {
  poolId: any;
  pool: string;
  gauge: string;
  lpToken: string;
  rewards?: { address; apy }[];
  name?: string;
  totalSupplied?: string;
  api?: boolean;
}

export function balanceOfLabel(lpStaker: Address, user: Address): string {
  return `${lpStaker}.balanceOf.${user}`;
}

function claimableTokensLabel(lpStaker: Address, user: Address): string {
  return `${lpStaker}.claimableTokens(${user})`;
}

function additionalClaimableRewardLabel(lpStaker: Address, user: Address, token: Address): string {
  return `${lpStaker}.claimableReward(${user}.${token})`;
}

function claimableRewardLabel(lpStaker: Address, user: Address): string {
  return `${lpStaker}.claimableReward(${user})`;
}

function claimedRewardsForLabel(lpStaker: Address, user: Address): string {
  return `${lpStaker}.claimedRewardsFor(${user})`;
}

export function getApyBreakdown(apy: number) {
  const apr = apyToApr(apy, 365);
  const aprObj = getAprBreakdown(apr);
  const apyObj = {
    day: aprToApy(aprObj.day, 1),
    week: aprToApy(aprObj.week, 7),
    month: aprToApy(aprObj.month, 365 / 12),
    year: apy,
  };
  return { apy: apyObj, apr: aprObj };
}

function getAprBreakdown(apr: number) {
  return {
    day: apr / 365,
    week: apr / 52,
    month: apr / 12,
    year: apr,
  };
}

export const claimableTokens: AbiItem = {
  name: 'claimable_tokens',
  outputs: [{ type: 'uint256', name: '' }],
  inputs: [{ type: 'address', name: 'addr' }],
  stateMutability: 'view',
  type: 'function',
  constant: true,
};
