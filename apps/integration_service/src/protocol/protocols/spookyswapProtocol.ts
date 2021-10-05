import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  BalancesResponse,
  ChainIdEnum,
  IncomeLiquidityPosition,
  IncomeLiquidityPositionPair,
  IncomeToken,
  Logger,
  PoolTokenDto,
  ProtocolNameEnum,
  UniswapSubgraphLikeData,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { ChainAbbrEnum, ProjectEnum, SpookySwapProtocolEnum } from '@app/common/enum';

import { AccountService } from '../../account/account.service';
import { Web3Provider } from '../../chain/web3.provider';
import {
  ClaimableDto,
  IntegrationClaimableTokenDto,
  IntegrationStakingPositionDto,
  LPToken,
  StakingPositionResponseDto,
} from '../../integrations/integrations.dto';
import { NotifyPayloadFeaturesDto } from '../../jobs/notify.payload.features.dto';
import { PriceService } from '../../price/price.service';
import { LocalMultiCall } from '../../spookyswap/multicall/local.multi.call';
import { acelabMap, booMap, farmsMap, xBooMap } from '../../spookyswap/multicall/util';
import { SpookyswapAceLabSubgraph } from '../../thegraph/spookyswap.acelab.subgraph';
import { SpookyswapFarmSubgraph } from '../../thegraph/spookyswap.farm.subgraph';
import { FeatureEnum } from '../features/features.enum';
import DataProviderProtocol from './dataProviderProtocol';
import { Mapper } from './mappers/mapper';

@Injectable()
export class SpookySwapProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.ftm];
  readonly project = ProjectEnum.spookyswap;
  readonly name = SpookySwapProtocolEnum.SpookySwap;
  readonly displayName = 'SpookySwap';
  readonly features = {
    [ChainAbbrEnum.ftm]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    protected readonly web3Provider: Web3Provider,
    private readonly spookyswapFarmSubgraph: SpookyswapFarmSubgraph,
    private readonly spookyswapAceLabSubgraph: SpookyswapAceLabSubgraph,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly mapper: Mapper,
  ) {
    super();
    this.dataProvider = this;
  }

  protected async getData(addresses: string, chainId: ChainIdEnum): Promise<BaseData[]> {
    const originAddressesArray = addresses.toLowerCase().split(',');
    const pools: NotifyPayloadFeaturesDto = await this.cache.get(`${chainId}_SpookySwap_pools`);

    const web3Provider = this.web3Provider.web3Map.get(chainId);
    const multicall = new LocalMultiCall(web3Provider, this.logger);

    const results = await Promise.allSettled([
      this.getLiquidityPositions(originAddressesArray, pools, chainId),
      this.getStakingPositions(originAddressesArray, pools, chainId, multicall),
    ]);

    const response = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        response.push(...result.value);
      } else {
        this.logger.error('Failed to get SpookySwap', 'spookyswapProtocol');
        this.logger.error(result.reason, 'spookyswapProtocol');
      }
    });

    return response;
  }

  private async getLiquidityPositions(
    originAddressesArray: Address[],
    pools: NotifyPayloadFeaturesDto,
    chainId: ChainIdEnum,
  ): Promise<BaseData[]> {
    const balances = await this.accountService.getBalances(originAddressesArray, [chainId]);

    const poolData = await this.mapper.mapData(
      Object.keys(balances),
      originAddressesArray,
      await this.mapToUniswapResponseData(originAddressesArray, pools, balances),
      ProjectEnum.spookyswap,
      ProtocolNameEnum.SpookySwap,
      chainId,
    );

    return poolData;
  }

  private async getStakingPositions(
    originAddressesArray: Address[],
    pools: NotifyPayloadFeaturesDto,
    chainId: ChainIdEnum,
    multicall: LocalMultiCall,
  ): Promise<StakingPositionResponseDto[]> {
    const farmPromise = this.getSpookyswapFarm(originAddressesArray, pools, chainId, multicall);
    const acelabPromise = this.getSpookyswapAceLab(originAddressesArray, pools, chainId, multicall);
    const [farm, acelab] = await Promise.all([farmPromise, acelabPromise]);

    return [
      {
        totalValue: farm.totalValue + acelab.totalValue,
        stakingPositions: farm.stakingPositions.concat(acelab.stakingPositions),
      },
    ];
  }

  private async mapToUniswapResponseData(
    originAddressesArray: Address[],
    pools: NotifyPayloadFeaturesDto,
    balances: BalancesResponse,
  ): Promise<UniswapSubgraphLikeData> {
    return {
      subgraphPools: this.mapToUniswapLiquidityPosition(originAddressesArray, pools, balances),
    };
  }
  private mapToUniswapLiquidityPosition(
    originAddressesArray: Address[],
    pools: NotifyPayloadFeaturesDto,
    balances: BalancesResponse,
  ): Map<string, IncomeLiquidityPosition[]> {
    const uniswapLiquidityPositions = new Map<string, IncomeLiquidityPosition[]>();
    const lpTokenAddresses = pools.items.map((pool) => pool.address.toLowerCase());

    originAddressesArray.forEach((userAddress) => {
      const rawPositions = balances[userAddress.toLowerCase()].tokens
        .filter((balance) => lpTokenAddresses.includes(balance.token.address.toLowerCase()))
        .map((balance: any): IncomeLiquidityPosition => {
          const pool = pools.items.find(
            (p) => p.address.toLowerCase() === balance.token.address.toLowerCase(),
          );

          return plainToClass(IncomeLiquidityPosition, {
            liquidityTokenBalance: balance.decimalsAmount.toString(),
            user: balance.account,
            pair: plainToClass(IncomeLiquidityPositionPair, {
              id: pool.address,
              reserveUSD: pool.TVL,
              totalSupply: pool.lpToken.totalSupply,

              token0: this.formatIncomeToken(pool.tokens[0]),
              reserve0: pool.tokens[0].reserve,
              token0Price: pool.tokens[0].price,

              token1: this.formatIncomeToken(pool.tokens[1]),
              reserve1: pool.tokens[1].reserve,
              token1Price: pool.tokens[1].price,
            }),
          });
        });

      uniswapLiquidityPositions.set(userAddress.toLowerCase(), rawPositions);
    });

    return uniswapLiquidityPositions;
  }

  formatIncomeToken(token: PoolTokenDto): IncomeToken {
    return plainToClass(IncomeToken, {
      decimals: token.decimals,
      id: token.address,
      name: token.name,
      symbol: token.symbol,
    });
  }

  private async getSpookyswapFarm(
    originAddressesArray: Address[],
    pools: NotifyPayloadFeaturesDto,
    chainId: ChainIdEnum,
    multicall: LocalMultiCall,
  ): Promise<StakingPositionResponseDto> {
    const stakingPositions: IntegrationStakingPositionDto[] = [];

    const pricedRewardToken = pools.items
      .flatMap((item) => item.tokens)
      .find((token) => token.address.toLowerCase() === booMap.get(chainId).toLowerCase());

    const spookyswapUsers = await this.spookyswapFarmSubgraph.getMasterchefData(
      originAddressesArray,
    );

    const claimableRewards = await multicall.getPendingRewards(spookyswapUsers, chainId, 'farm');

    spookyswapUsers.forEach((user) => {
      const userClaimableArray = claimableRewards.filter(
        (claim) => claim.user.toLowerCase() === user.id.toLowerCase(),
      );

      user.balances.forEach((balance) => {
        if (!Number(balance.balance)) {
          return;
        }

        const pool = pools.items.find(
          (p) => p.address.toLowerCase() === balance.staked.toLowerCase(),
        );

        const stakedToken = plainToClass(LPToken, {
          address: pool.address,
          name: pool.lpToken.name,
          symbol: pool.lpToken.symbol,
          decimals: pool.lpToken.decimals,
          totalSupply: pool.lpToken.totalSupply,
          tokens: pool.tokens.map((token) => {
            const tokenBalance = new BigNumber(balance.balance)
              .div(pool.lpToken.totalSupply)
              .multipliedBy(token.reserve)
              .div(new BigNumber(10).pow(18));

            return plainToClass(PoolTokenDto, {
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              reserve: token.reserve,
              value: tokenBalance.multipliedBy(token.price).toNumber(),
              balance: tokenBalance.toString(),
              price: token.price,
              decimals: token.decimals,
            });
          }),
        });

        const userClaimable = userClaimableArray.find((pool) => pool.poolId === balance.poolId);
        const claimableBalance = new BigNumber(userClaimable.claimable).div(
          new BigNumber(10).pow(pricedRewardToken.decimals),
        );
        const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
          price: pricedRewardToken.price,
          symbol: pricedRewardToken.symbol,
          name: pricedRewardToken.name,
          address: pricedRewardToken.address,
          decimals: pricedRewardToken.decimals,
          claimableData: plainToClass(ClaimableDto, {
            balance: claimableBalance.toNumber(),
            value: claimableBalance.multipliedBy(pricedRewardToken.price).toString(),
          }),
        });

        const staking = plainToClass(IntegrationStakingPositionDto, {
          address: farmsMap.get(chainId),
          poolId: balance.poolId,
          poolName: pool.name,
          staked: balance.balance,
          rewardToken: rewardToken,
          stakingToken: stakedToken,
        });
        stakingPositions.push(staking);
      });
    });

    return {
      totalValue: 0, // unused
      stakingPositions,
    };
  }

  private async getSpookyswapAceLab(
    originAddressesArray: Address[],
    pools: NotifyPayloadFeaturesDto,
    chainId: ChainIdEnum,
    multicall: LocalMultiCall,
  ): Promise<StakingPositionResponseDto> {
    const stakingPositions: IntegrationStakingPositionDto[] = [];

    const spookyswapUsers = await this.spookyswapAceLabSubgraph.getMasterchefData(
      originAddressesArray,
    );

    const claimableRewards = await multicall.getPendingRewards(spookyswapUsers, chainId, 'acelab');

    const xBooForBoo = await multicall.getXBooForBoo(chainId);

    const pricedBooToken = pools.items
      .flatMap((item) => item.tokens)
      .find((token) => token.address.toLowerCase() === booMap.get(chainId).toLowerCase());

    const xBooToken = plainToClass(PoolTokenDto, {
      address: xBooMap.get(chainId),
      name: 'Boo MirrorWorld',
      symbol: 'xBOO',
      reserve: null,
      price: pricedBooToken.price * xBooForBoo,
      decimals: 18,
    });

    spookyswapUsers.forEach((user) => {
      const userClaimableArray = claimableRewards.filter(
        (claim) => claim.user.toLowerCase() === user.id.toLowerCase(),
      );

      user.balances.forEach((balance) => {
        const userStakedBalance = new BigNumber(balance.balance)
          .div(new BigNumber(10).pow(18))
          .toNumber();

        if (!userStakedBalance) {
          return;
        }

        // Single Staked, so fake the LP token and
        // add the single token as the only 'child'
        // so we can keep looping through and adding
        // total balances
        const stakedToken = plainToClass(LPToken, {
          address: xBooToken.address,
          name: xBooToken.name,
          symbol: xBooToken.symbol,
          decimals: xBooToken.decimals,
          tokens: [
            plainToClass(PoolTokenDto, {
              address: xBooToken.address,
              name: xBooToken.name,
              symbol: xBooToken.symbol,
              decimals: xBooToken.decimals,
              reserve: null,
              value: xBooToken.price * userStakedBalance,
              balance: userStakedBalance,
              price: xBooToken.price,
            }),
          ],
        });

        // TODO: this is single staked
        const pricedRewardToken = pools.items
          .flatMap((item) => item.tokens)
          .find((token) => token.address.toLowerCase() === balance.reward.toLowerCase());

        if (!pricedRewardToken) {
          this.logger.warn(
            `Failed to get farm data. missing token pair for ${balance.reward}`,
            'spookyswapProtocol',
          );
          return;
        }

        const userClaimable = userClaimableArray.find((pool) => pool.poolId === balance.poolId);

        const claimableBalance = new BigNumber(userClaimable.claimable).div(
          new BigNumber(10).pow(pricedRewardToken.decimals),
        );

        const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
          price: pricedRewardToken.price,
          symbol: pricedRewardToken.symbol,
          name: pricedRewardToken.name,
          address: pricedRewardToken.address,
          decimals: pricedRewardToken.decimals,
          claimableData: plainToClass(ClaimableDto, {
            balance: claimableBalance.toNumber(),
            value: claimableBalance.multipliedBy(pricedRewardToken.price).toString(),
          }),
        });

        const staking = plainToClass(IntegrationStakingPositionDto, {
          address: acelabMap.get(chainId),
          poolId: balance.poolId,
          poolName: pricedRewardToken.name,
          staked: balance.balance,
          rewardToken: rewardToken,
          stakingToken: stakedToken,
        });
        stakingPositions.push(staking);
      });
    });

    return {
      totalValue: 0, // unused
      stakingPositions,
    };
  }
}

export default SpookySwapProtocol;
