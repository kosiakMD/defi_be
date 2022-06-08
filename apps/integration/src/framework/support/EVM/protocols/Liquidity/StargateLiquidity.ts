import { FakeAssetService } from 'apps/integration/src/modules/microservices/fake.asset.service';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { CurrentPricesPayload } from '../../../../../common/dto';
import { toDecimals } from '../../../../../common/utils/util';

import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { ISupplyTokenUserEntry } from '../../../interfaces/tokens.supplied.interface';
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
    protected assetService: FakeAssetService,
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

    const totalLiquidityCalls = [];
    poolInfos.forEach((poolInfo) => {
      const lp = new ERC20(poolInfo.pool);
      totalLiquidityCalls.push(lp.totalSupply());
    });

    const totalStakedPerPool = await this.multicall.callArray(totalLiquidityCalls, this.meta.chain);

    return poolInfos.map((poolInfo, poolIdx) => {
      return this.formatPoolsOpportunityMinimal(poolInfo, totalStakedPerPool[poolIdx].toString());
    });
  }

  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      return updateStargateLpTokens(
        tokens,
        prices,
        this.multicall,
        this.abiService,
        this.meta.chain,
      );
    } catch (err) {
      this.logger.error(err.message, err.stack, 'StargateLiquidity');
      return tokens;
    }
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

    const value = balance * pool.supplied[0].token.price;

    const supplied: ISupplyTokenUserEntry[] = pool.supplied.map((tokenSupplied) => {
      return {
        token: tokenSupplied.token.underlying[0],
        amount: balance,
        value,
        tvl: tokenSupplied.tvl,
      };
    });

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

export const updateStargateLpTokens = async (
  tokens: any[],
  prices: CurrentPricesPayload,
  multiCall: MulticallAggregator,
  abiService: AbiService,
  chain: ChainIdEnum,
) => {
  const calls = new Map();
  const lp = tokens.find((token) => token.isLp);
  const lpAbi = await abiService.fetchAbi(lp.address, chain);
  const amountLpToLDAbi = lpAbi.find((item) => item.name === 'amountLPtoLD');

  tokens.forEach((token: any) => {
    if (token.isLp) {
      const contract = new DynamicContract(token.address);
      calls.set(
        `${token.address}.amount`,
        contract.createCall(amountLpToLDAbi, 10 ** token.decimals),
      );
    }
  });
  const results = await multiCall.handleInBatches(calls, chain);
  tokens.forEach((token: any) => {
    if (token.isLp) {
      prices[token.address] = toDecimals(
        results.get(`${token.address}.amount`).output.data,
        token.underlyingAssets[0]?.decimals,
      );
    }
  });
  return tokens;
};
