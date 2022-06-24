import { SynapseAssetService } from 'apps/integration/src/modules/microservices/synapse.asset.service';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export class SynapseLiquidity extends SingleContractProtocol<
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser
> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: SynapseAssetService,
    protected httpService: HttpService,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    lpToken: () => (item) => item.name === 'lpToken',
    poolLength: () => (item) => item.name === 'poolLength',
  };

  protected async fetchUserData(address: Address, pools: IPoolFeatureOpportunity[]) {
    const calls = new Map();
    pools.forEach((pool) => {
      const contract = new ERC20(pool.supplied[0].token.address);
      calls.set(`${address}.${pool.id}`, contract.balanceOf(address));
    });

    const results = await this.multicall.handleInBatches(calls, this.meta.chain);

    return pools.reduce((pools, pool) => {
      const userPool = this.formatUserData(address, pool, results);
      if (userPool) {
        pools.push(userPool);
      }

      return pools;
    }, []);
  }

  protected formatOpportunitySuppliedToken(
    poolToken: ISupplyTokenMinimal,
    token: ERC20Token,
  ): ISupplyTokenOpportunity {
    let tvl = 0;
    token.underlying?.forEach((underlying) => {
      underlying.value = underlying.reserve * underlying.price;
      tvl += underlying.value;
    });

    return {
      token,
      totalSupplied: +poolToken.totalSupplied,
      tvl: tvl || null,
    };
  }

  protected async fetchPoolInfos(poolIds: number[]): Promise<any[]> {
    const contract = this.getMainContract();

    const poolInfoCalls = poolIds.map((poolId) => {
      return contract.createCall(this.functions.lpToken, poolId);
    });

    const poolInfo = await this.multicall.callArray(poolInfoCalls, this.meta.chain);
    return poolInfo.map((poolAddress, idx) => ({
      poolId: idx,
      pool: poolAddress.toLowerCase(),
    }));
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IPoolFeatureMinimal[]> {
    const poolIds = Array.from(Array(Number(context.poolLength)).keys());

    const poolInfos = await this.fetchPoolInfos(poolIds);

    return poolInfos.map((poolInfo) => this.formatPoolsOpportunityMinimal(poolInfo));
  }

  protected formatPoolsOpportunityMinimal(poolInfo: { pool; poolId }): IPoolFeatureMinimal {
    return {
      id: `${poolInfo.pool}`,
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      supplied: [
        {
          token: {
            address: poolInfo.pool,
          },
          totalSupplied: null,
        },
      ],
    };
  }

  protected formatUserData(
    address: string,
    pool: IPoolFeatureOpportunity,
    data: any,
  ): IPoolFeatureUser {
    const balanceRaw = data.get(`${address}.${pool.id}`)?.output.data;
    const balance = normalizeDecimals(balanceRaw, pool.supplied[0].token.decimals);
    if (!balance) return;
    const poolShare = balance / pool.supplied[0].token.totalSupply;

    const supplied: ISupplyTokenUserEntry[] = pool.supplied[0].token.underlying.map(
      (underlying) => {
        return {
          tvl: underlying.reserve * underlying.price,
          amount: poolShare * underlying.reserve,
          value: poolShare * underlying.reserve * underlying.price,
          token: {
            ...underlying,
          },
        };
      },
    );

    return {
      ...pool,
      token: {
        ...pool.token,
        amount: balance,
      },
      supplied,
    };
  }
}
