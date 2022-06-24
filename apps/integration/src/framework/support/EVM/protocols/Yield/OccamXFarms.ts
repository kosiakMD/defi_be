import { AssembledAssetInterface } from '@sdk/assets/interfaces';
import { BigNumber as BN } from 'bignumber.js';
import { Cache } from 'cache-manager';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, Logger } from '@app/common';
import { OCX_TOKEN_ADDRESS } from '@app/common/constant/protocols/occamx.constants';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { RpcService } from '../../../../../modules/microservices/rpc.service';
import { UniswapV2AssetService } from '../../../../../modules/microservices/uniswap.asset.service';
import { IRootProtocol, IUserDataProtocolResponse } from '../../../interfaces';
import { BaseWithTokens } from '../../../interfaces/new.interfaces';
import { IClaimableTokenUserEntry } from '../../../interfaces/tokens.claimable.interface';
import {
  IRewardTokenMinimal,
  IRewardTokenOpportunity,
} from '../../../interfaces/tokens.rewarded.interface';
import {
  ISupplyTokenMinimal,
  ISupplyTokenOpportunity,
  ISupplyTokenUserEntry,
} from '../../../interfaces/tokens.supplied.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { OccamXBase } from '../../Bases/OccamX/OccamXBase';
import { IOccamXPool, IOccamXProtocolMeta } from '../../Bases/OccamX/occamx.interfaces';
import { IExtendedPool } from '../../Subgraphs/OccamXSubgraph';

interface IOccamXMeta {
  tvl: string;
  lpTotalSupply: string;
  lpPrice: string;
}

type IOccamXStakingFeatureMinimal = BaseWithTokens<
  ISupplyTokenMinimal[],
  IRewardTokenMinimal,
  void,
  IOccamXMeta
>;

type IOccamXStakingFeatureOpportunity = BaseWithTokens<
  ISupplyTokenOpportunity[],
  IRewardTokenOpportunity,
  void,
  IOccamXMeta
>;

type IOccamXStakingFeatureUser = BaseWithTokens<
  ISupplyTokenUserEntry,
  IClaimableTokenUserEntry,
  void,
  void
>;

export class OccamXFarms
  extends OccamXBase<
    IOccamXStakingFeatureMinimal,
    IOccamXStakingFeatureOpportunity,
    IOccamXStakingFeatureUser,
    IOccamXProtocolMeta
  >
  implements IRootProtocol
{
  constructor(
    @Inject(CACHE_MANAGER) protected cache: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly multicall: MulticallAggregator,
    protected assetService: UniswapV2AssetService,
    protected httpService: HttpService,
    protected rpcService: RpcService,
    protected abiService: AbiService,
  ) {
    super();
  }

  async fetchOpportunityData(): Promise<IOccamXStakingFeatureMinimal[]> {
    return (await this.fetchAllPools()).map(this.toStakingFeatureMinimal.bind(this));
  }

  async fetchUsersData(
    addresses: Address[],
  ): Promise<IUserDataProtocolResponse<IOccamXStakingFeatureUser>> {
    const data = new Map<string, IOccamXStakingFeatureUser[]>(
      addresses.map((address) => [address, []]),
    );
    const errors: Error[] = [];

    for await (const [address] of data) {
      const pools = (await this.fetchUserPools(address)).filter((pool) =>
        new BN(pool.stakingBalance).toNumber(),
      );

      const extendedPools = await Promise.all(
        pools.map(
          async (pool) =>
            await this.fetchUserLiquidityPosition(this.toUserLPSubgraphVariables(address, pool)),
        ),
      );

      const cachedPools = new Map((await this.getPoolData()).data.map((pool) => [pool.id, pool]));

      const ocxToken = await this.assetService.getAsset(OCX_TOKEN_ADDRESS, this.meta.chain);

      data.set(
        address,
        extendedPools
          .map((extendedPool) => this.toStakingFeature(extendedPool, cachedPools, ocxToken))
          .filter((pool) => pool.reward.amount),
      );
    }

    return { data, errors };
  }

  formatUserData(
    address: string,
    pool: IOccamXStakingFeatureOpportunity,
    data: any,
  ): IOccamXStakingFeatureUser {
    return data.data.get(address).find(({ id }) => pool.id === id);
  }

  private toStakingFeature(
    extendedPool: IExtendedPool,
    cachedPools: Map<string, IOccamXStakingFeatureOpportunity>,
    rewardToken: AssembledAssetInterface,
  ): IOccamXStakingFeatureUser {
    const cachedPool = cachedPools.get(extendedPool.commonData.stakingToken.address);

    const supplyAmount = new BN(extendedPool.accountData.stakingBalance).toNumber();
    const supplyValue = new BN(supplyAmount) //
      .multipliedBy(cachedPool.meta.lpPrice)
      .toNumber();

    return {
      id: extendedPool.commonData.stakingToken.address,
      chain: this.meta.chain,
      feature: this.meta.feature,
      links: this.meta.links,
      supply: {
        token: {
          id: null,
          categories: null,
          address: cachedPool.id,
          chainId: this.meta.chain,
          name: extendedPool.commonData.stakingToken.name,
          symbol: extendedPool.commonData.stakingToken.symbol,
          decimals: extendedPool.commonData.stakingToken.decimals,
          price: new BN(cachedPool.meta.lpPrice).toNumber(),
          underlying: cachedPool.supplied.map(({ token }) => {
            const value = new BN(supplyValue) //
              .div(2)
              .toNumber();

            return {
              ...token,
              value,
              balance: new BN(value) //
                .div(token.price)
                .toNumber(),
            };
          }),
        },
        amount: supplyAmount,
        value: supplyValue,
        tvl: new BN(cachedPool.meta.tvl).toNumber(),
      },
      // NOTE: OCX token isn't tradable yet
      reward: {
        value: null,
        amount: new BN(extendedPool.accountData.rewardsAvailable).toNumber(),
        token: {
          id: null,
          address: rewardToken.address,
          name: rewardToken.name,
          symbol: rewardToken.symbol,
          decimals: rewardToken.decimals,
          chainId: this.meta.chain,
          totalSupply: new BN(rewardToken.totalSupply).toNumber(),
          price: null,
          categories: null,
          underlying: null,
        },
      },
    };
  }

  private toStakingFeatureMinimal(pool: IOccamXPool): IOccamXStakingFeatureMinimal {
    return {
      id: pool.liquidity_token.contract,
      chain: this.meta.chain,
      feature: this.meta.feature,
      supplied: [
        { token: { address: pool.token_0.contract } },
        { token: { address: pool.token_1.contract } },
      ],
      reward: {
        token: {
          address: OCX_TOKEN_ADDRESS,
        },
      },
      meta: {
        tvl: new BN(pool.tvl).toString(),
        lpPrice: new BN(pool.price_lt).toString(),
        lpTotalSupply: new BN(pool.total_supply).toString(),
      },
    };
  }
}
