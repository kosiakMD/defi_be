import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { toDecimals } from '../../../../../common/utils/util';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
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
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export class StargateLiquidity extends SingleContractProtocol<
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser
> {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    protected httpService: HttpService,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
  ) {
    super();
  }

  functionPredicates: INamedFunctionPredicates = {
    poolInfo: () => (item) => item.name === 'poolInfo',
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
    return {
      token,
      totalSupplied: +poolToken.totalSupplied,
      tvl: toDecimals(poolToken.totalSupplied, token.decimals) * token.underlying[0].price,
    };
  }

  protected async fetchPoolInfos(poolIds: number[]): Promise<any[]> {
    const contract = this.getMainContract();

    const poolInfoCalls = poolIds.map((poolId) => {
      return contract.createCall(this.functions.poolInfo, poolId);
    });

    const poolInfo = await this.multicall.callArray(poolInfoCalls, this.meta.chain);
    return poolInfo.map((poolInfo, idx) => ({
      poolId: idx,
      pool: poolInfo.lpToken.toLowerCase(),
    }));
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IPoolFeatureMinimal[]> {
    const poolIds = Array.from(Array(Number(context.poolLength)).keys());

    const poolInfos = await this.fetchPoolInfos(poolIds);

    const lpAbi = await this.abiService.fetchAbi(poolInfos[0].pool, this.meta.chain);
    const totalLiquidityAbi = lpAbi.find((item) => item.name === 'totalLiquidity');

    const totalLiquidityCalls = [];
    poolInfos.forEach((poolInfo) => {
      const lpContract = new DynamicContract(poolInfo.pool);
      totalLiquidityCalls.push(lpContract.createCall(totalLiquidityAbi));
    });

    const totalStakedPerPool = await this.multicall.callArray(totalLiquidityCalls, this.meta.chain);

    return poolInfos.map((poolInfo, poolIdx) => {
      return this.formatPoolsOpportunityMinimal(poolInfo, totalStakedPerPool[poolIdx].toString());
    });
  }

  protected formatPoolsOpportunityMinimal(
    poolInfo: { pool; poolId },
    totalLiquidity: string,
  ): IPoolFeatureMinimal {
    return {
      id: `${poolInfo.pool}`,
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      supplied: [
        {
          token: {
            address: poolInfo.pool,
          },
          totalSupplied: totalLiquidity,
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
    const underlying = pool.supplied[0].token.underlying[0];
    pool.supplied[0]['amount'] = underlying.balance = balance;
    pool.supplied[0]['value'] = underlying.value = balance * underlying.price;

    return pool as IPoolFeatureUser;
  }
}
