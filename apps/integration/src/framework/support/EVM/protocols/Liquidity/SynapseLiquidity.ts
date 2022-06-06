import { Cache } from 'cache-manager';

import { CACHE_MANAGER, HttpService, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, CurrentPricesPayload, FeatureEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { Ownable } from '@app/common/web3provider/contracts/Ownable';
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
    protected accountService: AccountService,
    protected priceService: PriceService,
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

  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      // Synapse use the sushiSwap token on ethereum
      if (this.meta.chain === ChainIdEnum.eth) {
        return await this.updateUniswapLikeTokensData(tokens, prices);
      }

      return await updateSynapseLpTokens(
        tokens,
        prices,
        this.multicall,
        this.logger,
        this.abiService,
        this.meta.chain,
      );
    } catch (err) {
      this.logger.error(err.message, err.stack, 'SynapseLiquidity');
      return tokens;
    }
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

export const updateSynapseLpTokens = async (
  tokens: any[],
  prices: CurrentPricesPayload,
  multiCall: MulticallAggregator,
  logger: Logger,
  abiService: AbiService,
  chain: ChainIdEnum,
) => {
  const lpContractCalls = new Map();
  const lpTokensMap = new Map();
  tokens?.forEach((token) => {
    if (token.isLp) {
      const owner = new Ownable(token.address);
      const lpContract = new ERC20(token.address);
      lpTokensMap.set(token.address, token);
      lpContractCalls.set(token.address, owner.owner());
      lpContractCalls.set(`${token.address}.totalSupply`, lpContract.totalSupply());
      token.underlyingAssets.forEach((underlying) => {
        if (underlying.isLp) {
          const underlyingOwner = new Ownable(underlying.address);
          lpContractCalls.set(underlying.address, underlyingOwner.owner());
        }
      });
    }
  });

  const lpCallsResp = await multiCall.handleInBatches(lpContractCalls, chain);
  const ownerAbi = await abiService.fetchAbi(
    Array.from(lpCallsResp.values())[0]?.output.data,
    chain,
  );
  const getVirtualPriceAbi = ownerAbi.find((item) => item.name === 'getVirtualPrice');
  const getTokenBalanceAbi = ownerAbi.find((item) => item.name === 'getTokenBalance');
  const calls = new Map();
  Array.from(lpTokensMap.entries()).forEach(([key, value]) => {
    const owner = lpCallsResp.get(key).output.data;
    const ownerContract = new DynamicContract(owner);
    value.totalSupply = toDecimals(
      lpCallsResp.get(`${key}.totalSupply`).output.data,
      value.decimals,
    );
    calls.set(`${key}.price`, ownerContract.createCall(getVirtualPriceAbi));
    value.underlyingAssets.forEach((underlying) => {
      if (underlying.isLp) {
        const underlyingOwner = new DynamicContract(
          lpCallsResp.get(underlying.address).output.data,
        );
        calls.set(`${underlying.address}.price`, underlyingOwner.createCall(getVirtualPriceAbi));
      }
      calls.set(
        `${key}.${underlying.positionInPool}`,
        ownerContract.createCall(getTokenBalanceAbi, underlying.positionInPool),
      );
    });
  });

  const results = await multiCall.handleInBatches(calls, chain);
  Array.from(lpTokensMap.values()).forEach((token: any) => {
    prices[token.address] = toDecimals(
      results.get(`${token.address}.price`)?.output.data,
      token.decimals,
    );
    token.underlyingAssets.forEach((underlying) => {
      underlying.reserve = toDecimals(
        results.get(`${token.address}.${underlying.positionInPool}`).output.data,
        underlying.decimals,
      );
      prices[underlying.address] =
        prices[underlying.address] ||
        toDecimals(results.get(`${underlying.address}.price`)?.output.data, underlying.decimals);
    });
  });
  return tokens;
};
