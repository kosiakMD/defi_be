import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';

import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, FeatureEnum, Logger } from '@app/common';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { UniswapV2AssetService } from '../../../../../modules/microservices/uniswap.asset.service';
import { INamedFunctionPredicates, IProtocolMeta, IRootProtocol } from '../../../interfaces';
import {
  IPoolFeatureMinimal,
  IPoolFeatureOpportunity,
  IPoolFeatureUser,
} from '../../../interfaces/feature.pool.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { SingleContractProtocol } from '../../SingleContractProtocol';

export interface IPoolTokenRaw {
  tokenAddress: string;
  amount: string;
  price: string;
  portfolioShare: string;
}

export interface IPoolRaw {
  name: string;
  contractAddress: string;
  baseTokenAddress: string;
  lpTokenAddress: string;
  lpTokenPrice: string;
  totalValue: string;
  tokens: IPoolTokenRaw[];
}

export interface IBlueshiftMeta extends IProtocolMeta {
  name: string;
  address: Address;
}

export class BlueshiftLiquidity
  extends SingleContractProtocol<
    IPoolFeatureMinimal,
    IPoolFeatureOpportunity,
    IPoolFeatureUser,
    IBlueshiftMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected assetService: UniswapV2AssetService,
    protected multicall: MulticallAggregator,
    protected abiService: AbiService,
  ) {
    super();
  }

  protected functionPredicates: INamedFunctionPredicates = {
    getPortfolios: () => (item) => item.name === 'getPortfolios',
  };

  async initialize() {
    this.functions = await this.abiService.parseFunctionsFromAddress(
      this.meta.address,
      this.meta.chain,
      this.functionPredicates,
    );
  }

  protected async fetchOpportunityData(): Promise<IPoolFeatureMinimal[]> {
    const contract = new DynamicContract(this.meta.address);
    const pools: IPoolRaw[] = await this.multicall.call(
      contract.createCall(this.functions.getPortfolios),
      this.meta.chain,
    );

    return pools.map(this.toPoolFeatureMinimal.bind(this));
  }

  protected fetchUserData(
    address: string,
    pools: IPoolFeatureOpportunity[],
  ): Promise<IPoolFeatureUser[]> {
    console.log('fetchUserData', { address, pools });
    return null;
  }

  private toPoolFeatureMinimal(pool: IPoolRaw): IPoolFeatureMinimal {
    return {
      id: pool.lpTokenAddress,
      chain: this.meta.chain,
      feature: FeatureEnum.pools,
      supplied: pool.tokens.map(({ tokenAddress, amount, portfolioShare, price }) => ({
        token: {
          address: tokenAddress,
        },
        weight: portfolioShare,
        totalSupplied: new BN(amount) //
          .multipliedBy(price)
          .toString(),
      })),
    };
  }
}
