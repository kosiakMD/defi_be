import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address } from '@app/common';
import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { TokemakToken } from '@app/common/web3provider/contracts/protocols/tokemak/TokemakToken';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AssetService } from '../../../../../modules/microservices/asset.service';
import { INamedFunctionPredicates } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

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

    pools.forEach((pool: IStakingFeatureOpportunity) => {
      const token = this.tokens.get(pool.id);
      calls.set(pool.id, token.balanceOf(address));
    });

    const result = await this.multicall.handleInBatches(calls, this.meta.chain);

    return this.formatUserData(address, pools, result);
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
      // Update supplied token
      Object.assign(pool.supplied[0], {
        amount: balance,
        value: balance * pool.supplied[0].token.price,
      });

      return pool as IStakingFeatureUserEntry;
    });
  }
}
