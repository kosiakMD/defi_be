import { AssetCategory } from 'apps/assets/src/modules/assets/enums/asset-category.enum';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address } from '@app/common';
import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { UniswapV2Pair } from '@app/common/web3provider/contracts/UniswapV2Pair';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetService } from '../../../../../modules/microservices/asset.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';
import { TokemakToken } from '../../contracts/TokemakToken';

export class TokemakReactor extends SingleContractProtocol<
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry
> {
  private tokens = new Map<string, TokemakToken>();
  protected functionPredicates: INamedFunctionPredicates = {
    pools: () => (item) => item.name === 'getPools',
  };

  constructor(
    protected httpService: HttpService,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    protected assetService: AssetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
  ) {
    super();
  }

  protected async fetchOpportunityData(context: {
    [key: string]: any;
  }): Promise<IStakingFeatureMinimal[]> {
    const calls = new Map();
    context.pools.forEach((pool: Address) => {
      const token = new TokemakToken(pool);
      this.tokens.set(pool, token);
      calls.set(`${pool}-totalSupply`, token.totalSupply());
      calls.set(`${pool}-underlyer`, token.underlyer());
    });
    const result = await this.multicall.handleInBatches(calls, this.meta.chain);
    return context.pools.map((pool: Address) => {
      return {
        feature: this.meta.feature,
        chain: this.meta.chain,
        id: pool,
        supplied: [
          {
            token: { address: result.get(`${pool}-underlyer`).output.data },
            totalSupplied: result.get(`${pool}-totalSupply`).output.data,
          },
        ],
        rewarded: [],
      };
    });
  }

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const calls = new Map();
    pools.forEach((pool) => {
      const token = this.tokens.get(pool.id);
      calls.set(pool.id, token.balanceOf(address));
    });

    const result = await this.multicall.handleInBatches(calls, this.meta.chain);

    return this.formatUserData(address, pools, result);
  }

  protected async getTokens(addresses: string[]): Promise<[string, any][]> {
    const assets = await this.assetService.getAssets(
      addresses.map((address) => ({ address, chainId: this.meta.chain })),
    );

    const calls = new Map();
    assets.forEach(([, asset]) => {
      if (this.isLpToken(asset)) {
        const LpToken = new UniswapV2Pair(asset.address);

        calls.set(`${asset.address}-reserves`, LpToken.getReserves());

        calls.set(`${asset.address}-totalSupply`, LpToken.totalSupply());
      }
    });
    const res = await this.multicall.handleInBatches(calls, this.meta.chain);

    assets.forEach(([address, asset]) => {
      if (this.isLpToken(asset)) {
        const reserves = res.get(`${address}-reserves`).output.data;
        const totalSupply = res.get(`${address}-totalSupply`).output.data;
        asset.underlying.forEach((underlying) => {
          Object.assign(underlying, {
            reserve: normalizeDecimals(reserves[underlying.position], asset.decimals),
          });
        });
        Object.assign(asset, {
          totalSupply: normalizeDecimals(totalSupply, asset.decimals),
        });
      }
    });

    return assets;
  }

  protected formatUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
    data: any,
  ): IStakingFeatureUserEntry[] {
    return pools.map((pool) => {
      const balance = normalizeDecimals(
        data.get(pool.id).output.data,
        pool.supplied[0].token.decimals,
      );

      if (!balance) return;

      if (this.isLpToken(pool.supplied[0].token)) {
        const percentage = balance / pool.supplied[0].token.totalSupply;

        let sum = 0;
        pool.supplied[0].token.underlying.forEach((underlying) => {
          Object.assign(underlying, {
            balance: percentage * underlying.reserve,
            value: percentage * underlying.reserve * underlying.price,
          });
          sum += underlying.value;
        });

        Object.assign(pool.supplied[0], {
          amount: balance,
          value: sum,
        });

        return pool as IStakingFeatureUserEntry;
      }

      // Update supplied token
      Object.assign(pool.supplied[0], {
        amount: balance,
        value: balance * pool.supplied[0].token.price,
      });

      return pool as IStakingFeatureUserEntry;
    });
  }

  private isLpToken(asset: ERC20Token): boolean {
    return asset.categories.some((c) => c.code === AssetCategory.LpToken);
  }
}
