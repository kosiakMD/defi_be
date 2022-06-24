import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, FeatureEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { normalizeDecimals } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IProtocolMeta, IRootProtocol } from '../../../interfaces';
import { IPoolFeatureEntryUserEntry } from '../../../interfaces/feature.pool.interface';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { EVMCore } from '../../EVMCore';
import { ARRAKIS_POOLS_QUERY, ArrakisPool } from '../../Subgraphs/ArrakisSubgraph';

const WORKING_PLG_GAUGE_ADDRESS_FOR_ABI_FETCHING = '0x16bb396868cc76d179533a18ed6b11a1ec8bd49a';

// Unfortunatlely possible to programatically get this at the moment for each gauge.
// Rewards are currently only on plg and only in WMATIC, we have to keep an eye if this changes in future.
const WMATIC_PLG_REWARD_ADDRESS = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';
type ArrakisPoolExtra = {
  gaugeAddress: string;
  reserves0?: string;
  reserves1?: string;
  vaultTotalSupply?: string;
  gaugeTotalSupply?: string;
};
type ArrakisPoolFeatureEntryOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity[],
  IRewardTokenOpportunity[],
  void,
  ArrakisPoolExtra
>;
type ArrakisPoolFeatureEntryMinimal = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal[],
  void,
  ArrakisPoolExtra
>;
export type IArrakisMeta = IProtocolMeta & {
  subgraphUrl: string;
  gaugeMapperAddress?: string;
};

export class ArrakisLiquidity
  extends EVMCore<
    ArrakisPoolFeatureEntryMinimal,
    ArrakisPoolFeatureEntryOpportunity,
    IPoolFeatureEntryUserEntry,
    IArrakisMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected httpService: HttpService,
    // only used to get totalSupply
    protected multicall: MulticallAggregator,
    protected readonly web3Provider: Web3ProviderService,
    protected readonly abiService: AbiService,
    protected assetService: FakeAssetService,
  ) {
    super();
  }

  private gaugeFunctions;
  private gaugeMapperFunctions;

  async initialize() {
    this.gaugeFunctions = await this.abiService.parseFunctionsFromAddress(
      WORKING_PLG_GAUGE_ADDRESS_FOR_ABI_FETCHING,
      ChainIdEnum.plg,
      {
        claimableReward: () => (item) => item.name === 'claimable_reward',
        rewardData: () => (item) => item.name === 'reward_data',
      },
    );

    if (this.meta.gaugeMapperAddress) {
      this.gaugeMapperFunctions = await this.abiService.parseFunctionsFromAddress(
        this.meta.gaugeMapperAddress,
        this.meta.chain,
        {
          gauges: () => (item) => item.name === 'gauges',
          gaugeToVault: () => (item) => item.name === 'gaugeToVault',
        },
      );
    }
  }

  async getUsersData(
    addresses: string[],
  ): Promise<{ data: Map<string, IPoolFeatureEntryUserEntry[]>; errors: Error[] }> {
    const { data: pools, errors } = await this.getPoolData();
    const result: Map<string, IPoolFeatureEntryUserEntry[]> = new Map();

    const balances = await this.getUserBalances(addresses, pools);

    for (const address of addresses) {
      const positions: IPoolFeatureEntryUserEntry[] = [];
      for (const pool of pools) {
        try {
          const vaultTokenBalanceOfUser = balances.get(getLabel(address, pool.id, 'vault_balance'))
            .output.data;
          const gaugeTokenBalanceOfUser = balances.has(getLabel(address, pool.id, 'gauge_balance'))
            ? balances.get(getLabel(address, pool.id, 'gauge_balance')).output.data
            : new BigNumber(0);
          const claimableRewardBalance = balances.has(
            getLabel(address, pool.id, 'claimable_balance'),
          )
            ? balances.get(getLabel(address, pool.id, 'claimable_balance')).output.data
            : new BigNumber(0);

          const userBalance = vaultTokenBalanceOfUser.gt(0)
            ? vaultTokenBalanceOfUser
            : gaugeTokenBalanceOfUser;

          const totalSupply = vaultTokenBalanceOfUser.gt(0)
            ? pool.meta.vaultTotalSupply
            : pool.meta.gaugeTotalSupply;

          if (userBalance.gt(0)) {
            const poolShare = userBalance.dividedBy(totalSupply);
            const token0Balance = new BigNumber(pool.meta.reserves0).multipliedBy(poolShare);
            const token0Value = new BigNumber(pool.supplied[0].token.price).multipliedBy(
              token0Balance,
            );
            const token1Balance = new BigNumber(pool.meta.reserves1).multipliedBy(poolShare);
            const token1Value = new BigNumber(pool.supplied[1].token.price).multipliedBy(
              token1Balance,
            );
            const rewarded = [];
            if (claimableRewardBalance.gt(0)) {
              rewarded.push({
                ...pool.rewarded[0],
                amount: normalizeDecimals(claimableRewardBalance, pool.rewarded[0].token.decimals),
                value: normalizeDecimals(
                  claimableRewardBalance.multipliedBy(new BigNumber(pool.rewarded[0].token.price)),
                  pool.rewarded[0].token.decimals,
                ),
              });
            }

            positions.push({
              id: pool.id,
              chain: this.meta.chain,
              feature: FeatureEnum.pools,
              supplied: [
                {
                  ...pool.supplied[0],
                  amount: normalizeDecimals(token0Balance as any, pool.supplied[0].token.decimals),
                  value: normalizeDecimals(token0Value as any, pool.supplied[0].token.decimals),
                },
                {
                  ...pool.supplied[1],
                  amount: normalizeDecimals(token1Balance as any, pool.supplied[1].token.decimals),
                  value: normalizeDecimals(token1Value as any, pool.supplied[1].token.decimals),
                },
              ],
              rewarded,
            });
          }
        } catch (e) {
          errors.push(e);
        }
      }
      result.set(address, positions);
    }

    return { data: result, errors };
  }

  private async getUserBalances(addresses, pools): Promise<Map<string, CallData>> {
    let result: Map<string, CallData> = new Map();

    for (const address of addresses) {
      const balanceCalls: Map<string, CallData> = new Map();

      for (const pool of pools) {
        const vaultTokenContract = new ERC20(pool.id);
        const gaugeTokenContract = pool.meta.gaugeAddress
          ? new ERC20(pool.meta.gaugeAddress)
          : null;

        balanceCalls.set(
          getLabel(address, pool.id, 'vault_balance'),
          vaultTokenContract.balanceOf(address),
        );
        if (gaugeTokenContract) {
          balanceCalls.set(
            getLabel(address, pool.id, 'gauge_balance'),
            gaugeTokenContract.balanceOf(address),
          );
        }

        if (pool.meta.gaugeAddress && pool.rewarded[0]) {
          const gaugeContract = new DynamicContract(pool.meta.gaugeAddress);

          const claimableRewardBalanceCall = gaugeContract.createCall(
            this.gaugeFunctions.claimableReward,
            address,
            pool.rewarded[0].token.address,
          );
          balanceCalls.set(
            getLabel(address, pool.id, 'claimable_balance'),
            claimableRewardBalanceCall,
          );
        }
      }
      result = new Map([
        ...result,
        ...(await this.multicall.handleInBatches(balanceCalls, this.meta.chain)),
      ]);
    }
    return result;
  }

  private async getTotalSupplies(pools): Promise<Map<string, CallData>> {
    let result: Map<string, CallData> = new Map();

    const totalSupplyCalls: Map<string, CallData> = new Map();

    for (const pool of pools) {
      const vaultTokenContract = new ERC20(pool.id);
      const gaugeTokenContract = pool.meta.gaugeAddress ? new ERC20(pool.meta.gaugeAddress) : null;

      totalSupplyCalls.set(
        getTotalSupplyLabel(pool.id, 'vault_total_supply'),
        vaultTokenContract.totalSupply(),
      );
      if (gaugeTokenContract) {
        totalSupplyCalls.set(
          getTotalSupplyLabel(pool.id, 'gauge_total_supply'),
          gaugeTokenContract.totalSupply(),
        );
      }
    }
    result = new Map([
      ...result,
      ...(await this.multicall.handleInBatches(totalSupplyCalls, this.meta.chain)),
    ]);
    return result;
  }

  protected async updateRealTimeData?(
    opportunities: ArrakisPoolFeatureEntryMinimal[],
  ): Promise<ArrakisPoolFeatureEntryMinimal[]> {
    const poolInfos = await this.getArrakisPools();
    const poolAddressToInfoMap = new Map(poolInfos.map((x) => [x.id, x]));

    const totalSupplies = await this.getTotalSupplies(opportunities);

    return opportunities.map((opp) => {
      const poolInfo = poolAddressToInfoMap.get(opp.id);
      return {
        ...opp,
        meta: {
          ...opp.meta,
          reserves0: poolInfo.latestInfo.reserves0,
          reserves1: poolInfo.latestInfo.reserves1,
          vaultTotalSupply: totalSupplies.get(getTotalSupplyLabel(opp.id, 'vault_total_supply'))
            .output.data,
          gaugeTotalSupply: opp.meta.gaugeAddress
            ? totalSupplies.get(getTotalSupplyLabel(opp.id, 'gauge_total_supply')).output.data
            : null,
        },
      };
    });
  }

  /**
   * Get longer term cacheable info
   */
  async getCacheableOpportunityData(): Promise<ArrakisPoolFeatureEntryMinimal[]> {
    let pools = await this.getArrakisPools();
    if (this.meta.gaugeMapperAddress) {
      pools = await Promise.all(
        pools.map(async (pool: ArrakisPool) => {
          if (!pool.gaugeAddress) {
            return pool;
          }

          const gaugeContract = new DynamicContract(pool.gaugeAddress);

          const rewardDataCall = gaugeContract.createCall(
            this.gaugeFunctions.rewardData,
            WMATIC_PLG_REWARD_ADDRESS,
          );

          const rewardRate = (await this.multicall.call(rewardDataCall, this.meta.chain)).rate;
          return {
            ...pool,
            rewardPerSecond: rewardRate,
            rewardTokenAddress: WMATIC_PLG_REWARD_ADDRESS,
          };
        }),
      );
    }

    return pools.map((x) => this.toFeatureEntryMinimal(x));
  }

  private toFeatureEntryMinimal(pool: ArrakisPool): ArrakisPoolFeatureEntryMinimal {
    return {
      meta: {
        gaugeAddress: pool.gaugeAddress,
      },
      id: pool.id,
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      supplied: [
        {
          token: { address: pool.token0.address.toLowerCase() },
          totalSupplied: pool.latestInfo.reserves0,
        },
        {
          token: { address: pool.token1.address.toLowerCase() },
          totalSupplied: pool.latestInfo.reserves1,
        },
      ],
      rewarded: pool.rewardTokenAddress
        ? [
            {
              token: { address: pool.rewardTokenAddress },
              rewardPerSecond: pool.rewardPerSecond,
            },
          ]
        : [],
    };
  }

  private async getArrakisPools(): Promise<ArrakisPool[]> {
    const $data = this.httpService.post(this.meta.subgraphUrl, {
      query: ARRAKIS_POOLS_QUERY,
    });

    const nonEmptyPools = (await firstValueFrom($data)).data.data.pools.filter(
      (x: ArrakisPool) => +x.latestInfo.reserves0 > 0 || +x.latestInfo.reserves1 > 0,
    );

    if (this.meta.gaugeMapperAddress) {
      const gaugeToVaultMap = await this.getVaultToGaugeMap();
      return nonEmptyPools.map((pool: ArrakisPool) => ({
        ...pool,
        gaugeAddress: gaugeToVaultMap.get(pool.id),
      }));
    }
    return nonEmptyPools;
  }

  private async getVaultToGaugeMap(): Promise<Map<string, string>> {
    const mapping: any[] = await this.getOrSet(
      60 * 60 * 3,
      'arrakis_gauge_to_vault_map',
      async () => {
        const arrayedMapping = [];
        const gaugeMapperContract = new DynamicContract(this.meta.gaugeMapperAddress);

        let index = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          try {
            const getGaugeAddressCall = gaugeMapperContract.createCall(
              this.gaugeMapperFunctions.gauges,
              index,
            );
            const gaugeAddress = await this.multicall.call(getGaugeAddressCall, this.meta.chain);
            const getVaultCall = gaugeMapperContract.createCall(
              this.gaugeMapperFunctions.gaugeToVault,
              gaugeAddress,
            );
            const vaultAddress = await this.multicall.call(getVaultCall, this.meta.chain);
            arrayedMapping.push([vaultAddress.toLowerCase(), gaugeAddress.toLowerCase()]);
            index++;
          } catch (e) {
            break;
          }
        }

        return arrayedMapping;
      },
    );
    return new Map(mapping);
  }
}

const getTotalSupplyLabel = (poolId, label: 'vault_total_supply' | 'gauge_total_supply') =>
  label + poolId;
const getLabel = (
  address: string,
  poolId: string,
  label: 'vault_balance' | 'gauge_balance' | 'claimable_balance',
) => address + poolId + label;
