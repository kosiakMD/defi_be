import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
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

export class TokemakStaking extends SingleContractProtocol<
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry
> {
  protected functionPredicates: INamedFunctionPredicates = {
    token: () => (item) => item.name === 'tokeToken',
    balanceOf: () => (item) => item.name === 'balanceOf',
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
    const token = new ERC20(context.token);
    const totalSupplied = await this.multicall.call(
      token.balanceOf(this.meta.address),
      this.meta.chain,
    );
    return [
      {
        id: this.meta.address,
        feature: this.meta.feature,
        chain: this.meta.chain,
        supplied: [
          {
            token: { address: context.token },
            totalSupplied,
          },
        ],
        rewarded: [],
      },
    ];
  }

  protected async fetchUserData(
    address: string,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const contract = this.getMainContract();

    const results = await this.multicall.call(
      contract.createCall(this.functions.balanceOf, address),
      this.meta.chain,
    );

    return [this.formatUserData(address, pools[0], results)];
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    const balance = normalizeDecimals(data, pool.supplied[0].token.decimals);

    if (!balance) return;
    // Update supplied token
    Object.assign(pool.supplied[0], {
      amount: balance,
      value: balance * pool.supplied[0].token.price,
    });

    return pool as IStakingFeatureUserEntry;
  }
}
