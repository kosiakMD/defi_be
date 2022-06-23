import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { UniswapV2AssetService } from '../../../../../modules/microservices/uniswap.asset.service';
import { FeatureEnum } from '../../../enums';
import { INamedFunctionPredicates, IProtocolMeta } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export interface ISushiSingleMeta extends IProtocolMeta {
  address: Address;
  feature: FeatureEnum.staking;
  name: string;
  sushi: string;
}

export class SushiswapStakingSingle extends SingleContractProtocol<
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
  ISushiSingleMeta
> {
  constructor(
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: UniswapV2AssetService,
  ) {
    super();
  }

  protected functionPredicates: INamedFunctionPredicates = {};

  protected async fetchOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    const contract = new ERC20(this.meta.sushi);
    const totalSupplied = await this.multicall.call(
      contract.balanceOf(this.meta.address),
      this.meta.chain,
    );

    return [
      {
        id: this.meta.address,
        chain: this.meta.chain,
        feature: this.meta.feature,
        supplied: [
          {
            token: {
              address: this.meta.sushi,
            },
            totalSupplied,
          },
        ],
        rewarded: [],
      },
    ];
  }

  protected async fetchUserData(
    address: Address,
    pools: IStakingFeatureOpportunity[],
  ): Promise<IStakingFeatureUserEntry[]> {
    const tokenContract = new ERC20(this.meta.address);
    const balance = await this.multicall.call(tokenContract.balanceOf(address), this.meta.chain);
    const resultPools = [];
    const userPool = this.formatUserData(address, pools[0], balance);
    if (userPool) {
      resultPools.push(userPool);
    }
    return resultPools;
  }

  protected formatUserData(
    address: string,
    pool: IStakingFeatureOpportunity,
    data: any,
  ): IStakingFeatureUserEntry {
    if (Number(data) <= 0) return;
    const balanceDec = normalizeDecimals(data, pool.token.decimals);
    const ratio = pool.supplied[0].tvl / pool.supplied[0].token.price / pool.token.totalSupply;
    const amount = ratio * balanceDec;

    pool.token.balance = balanceDec;
    pool.supplied[0] = Object.assign(pool.supplied[0], {
      amount,
      value: amount * pool.supplied[0].token.price,
    });

    return pool as IStakingFeatureUserEntry;
  }
}
