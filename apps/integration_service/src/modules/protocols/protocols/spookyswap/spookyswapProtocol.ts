import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  AccountBalance,
  AccountTokenBalance,
  Address,
  BalancesResponse,
  ChainDto,
  ChainIdEnum,
  IncomeLiquidityPosition,
  IncomeLiquidityPositionPair,
  IncomeToken,
  Logger,
  ProtocolNameEnum,
  ProtocolTypeEnum,
  UniswapSubgraphLikeData,
} from '@app/common';
import { FeatureEnum } from '@app/common';
import { ClaimableDto, IntegrationClaimableTokenDto } from '@app/common';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { ChainAbbrEnum, ProjectEnum, SpookySwapProtocolEnum } from '@app/common/enum';
import { NotifyPools } from '@app/common/jobs/notify.dto';
import { PoolTokenDto } from '@app/common/jobs/pools';

import {
  IntegrationStakingPositionDto,
  LPToken,
  StakingPositionResponseDto,
} from '../../../../common/dto/integrations.dto';
import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { Web3Provider } from '../../../chains/web3.provider';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { SpookyswapAceLabSubgraph } from '../../../subgraphs/subgraphs/spookyswap.acelab.subgraph';
import { SpookyswapFarmSubgraph } from '../../../subgraphs/subgraphs/spookyswap.farm.subgraph';
import { Mapper } from '../../helpers/mappers/mapper';
import DataProviderProtocol from '../dataProviderProtocol';
import { acelabMap, booMap, farmsMap, xBooMap } from './helpers/multicall.helpers';
import { SpookyswapLocalMultiCall } from './spookyswap.local.multi.call';
import { keepETHAddresses } from '@app/common/utils';

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
  static feeRate = 0.003;

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

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    addresses = keepETHAddresses(addresses);
    const chainFeatures = await Promise.allSettled(
      this.features[chain.abbr].map((f) => {
        return this.getFeatureData(addresses, chain, f);
      }),
    );

    const data = [];
    const errors = [];
    chainFeatures.forEach((r) => {
      if (r.status === 'fulfilled') {
        data.push(r.value);
      } else {
        this.logger.error(r.reason, r.reason.stack, SpookySwapProtocol.name);
        errors.push(r.reason.toString());
      }
    });

    return [data.flat(), errors];
  }

  public async getFeatureData(
    addresses: Address[],
    chain: ChainDto,
    feature: FeatureEnum,
  ): Promise<BaseData[]> {
    switch (feature) {
      // todo: add staking
      case FeatureEnum.staking:
        return this.getStakingPositionsV2(addresses, chain);
      case FeatureEnum.pools:
        return this.getLiquidityPositionsV2(addresses, chain);
      default:
        return [];
    }
  }

  async getStakingPositionsV2(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const pools = await this.getCachedPools(chain);

    const web3Provider = this.web3Provider.getForChain(chain.abbr);
    const multicall = new SpookyswapLocalMultiCall(web3Provider, this.logger);

    const farmPromise = this.getSpookyswapFarmV2(addresses, pools, chain.id, multicall);
    const acelabPromise = this.getSpookyswapAceLabV2(addresses, pools, chain.id, multicall);
    const [farm, acelab] = await Promise.all([farmPromise, acelabPromise]);

    const baseData: BaseDataStaking[] = [];
    addresses.forEach((a) => {
      const items = farm[a].concat(acelab[a]);
      if (!items.length) return;

      const toAdd: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain: chain,
        projectName: ProjectEnum.spookyswap,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        items: items, //farm.items.concat(acelab.items),
        feature: FeatureEnum.staking,
      });

      baseData.push(toAdd);
    });

    return baseData;
  }

  async getLiquidityPositionsV2(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const pools = await this.getCachedPools(chain);

    const balances = await this.getBalances(
      addresses,
      chain,
      pools.items.map((pool) => pool.address.toLowerCase()),
    );

    const baseData: BaseDataLp[] = [];
    addresses.forEach((a) => {
      const existedPositions = this.toLp(balances[a], pools.items);

      if (existedPositions.length > 0) {
        const toAdd: BaseDataLp = plainToClass(BaseDataLp, {
          chain: chain,
          userAddress: a,
          protocolType: ProtocolTypeEnum.amm,
          projectName: ProjectEnum.spookyswap,
          items: existedPositions,
          feature: FeatureEnum.pools,
        });
        baseData.push(toAdd);
      }
    });

    return baseData;
  }

  private toLp(lpBalance: AccountBalance, cachedPools: any[]): any[] {
    const cachedPoolsMap: Map<string, any> = new Map<string, any>(
      cachedPools.map((i) => [i.address, i]),
    );

    return lpBalance.tokens.map((tb) => {
      if (tb.decimalsAmount > 0) {
        return this.toPosition(tb, cachedPoolsMap.get(tb.token.address));
      }
    });
  }

  private toPosition(balance: any, poolData: any): any {
    const poolShare = new BigNumber(balance.decimalsAmount).div(
      new BigNumber(poolData.lpToken.totalSupply),
    );

    // simple rewriting pool data with user data, prices will be added later
    const userData = poolData;
    userData.tokens.forEach((t) => {
      t.value = null;
      t.price = null;
      t.balance = new BigNumber(t.reserve) //
        .times(poolShare)
        .toNumber();
    });
    userData.stats.share = poolShare.toNumber();
    userData.stats.feeRate = SpookySwapProtocol.feeRate;

    return userData;
  }

  getCachedPools(chain: ChainDto): Promise<NotifyPools> {
    return this.cache.get(`${chain.id}_SpookySwap_pools`);
  }

  getBalances(addresses: Address[], chain: ChainDto, assets: Address[]) {
    return this.accountService.getBalances(addresses, [chain.id], assets);
  }

  private async getSpookyswapFarmV2(
    originAddressesArray: Address[],
    pools: NotifyPools,
    chainId: ChainIdEnum,
    multicall: SpookyswapLocalMultiCall,
  ): Promise<any> {
    const pricedRewardToken = pools.items
      .flatMap((item) => item.tokens)
      .find((token) => token.address.toLowerCase() === booMap.get(chainId).toLowerCase());

    const spookyswapUsers = await this.spookyswapFarmSubgraph.getMasterchefData(
      originAddressesArray,
    );

    const claimableRewards = await multicall.getPendingRewards(spookyswapUsers, chainId, 'farm');

    const users = originAddressesArray.reduce((acc, cur) => ((acc[cur] = []), acc), {});

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
          rewards: [rewardToken],
          stakingToken: stakedToken,
        });
        users[user.id].push(staking);
      });
    });

    return users;
  }

  private async getSpookyswapAceLabV2(
    originAddressesArray: Address[],
    pools: NotifyPools,
    chainId: ChainIdEnum,
    multicall: SpookyswapLocalMultiCall,
  ): Promise<any> {
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

    const users: { [key: Address]: IntegrationStakingPositionDto[] } = originAddressesArray.reduce(
      (acc, cur) => ((acc[cur] = []), acc),
      {},
    );

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
          balance: userStakedBalance,
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
          rewards: [rewardToken],
          stakingToken: stakedToken,
        });

        users[user.id].push(staking);
      });
    });

    return users;
  }

  // V1
  protected async getData(addresses: string, chain: ChainDto): Promise<BaseData[]> {
    const originAddressesArray = addresses.toLowerCase().split(',');
    const pools = await this.getCachedPools(chain);

    if (!pools) {
      this.logger.error(`SpookySwap: No Pools Found! Chain: ${chain.id}`);
      throw new Error('Failed to retrieve available liquidity pools');
    }

    const web3Provider = this.web3Provider.getForChain(chain.abbr);
    const multicall = new SpookyswapLocalMultiCall(web3Provider, this.logger);

    const results = await Promise.allSettled([
      this.getLiquidityPositions(originAddressesArray, pools, chain),
      this.getStakingPositions(originAddressesArray, pools, chain.id, multicall),
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
    addresses: Address[],
    pools: NotifyPools,
    chain: ChainDto,
  ): Promise<BaseData[]> {
    const balances = await this.getBalances(
      addresses,
      chain,
      pools.items.map((pool) => pool.address.toLowerCase()),
    );

    const poolData = await this.mapper.mapData(
      Object.keys(balances),
      addresses,
      await this.mapToUniswapResponseData(addresses, pools, balances),
      ProjectEnum.spookyswap,
      ProtocolNameEnum.SpookySwap,
      chain,
    );

    return poolData;
  }

  private async getStakingPositions(
    originAddressesArray: Address[],
    pools: NotifyPools,
    chainId: ChainIdEnum,
    multicall: SpookyswapLocalMultiCall,
  ): Promise<StakingPositionResponseDto[]> {
    const farmPromise = this.getSpookyswapFarm(originAddressesArray, pools, chainId, multicall);
    const acelabPromise = this.getSpookyswapAceLab(originAddressesArray, pools, chainId, multicall);
    const [farm, acelab] = await Promise.all([farmPromise, acelabPromise]);

    return [
      {
        totalValue: 0, // unused, but required
        stakingPositions: farm.stakingPositions.concat(acelab.stakingPositions),
      },
    ];
  }

  private async mapToUniswapResponseData(
    originAddressesArray: Address[],
    pools: NotifyPools,
    balances: BalancesResponse,
  ): Promise<UniswapSubgraphLikeData> {
    return {
      subgraphPools: this.mapToUniswapLiquidityPosition(originAddressesArray, pools, balances),
    };
  }
  private mapToUniswapLiquidityPosition(
    originAddressesArray: Address[],
    pools: NotifyPools,
    balances: BalancesResponse,
  ): Map<string, IncomeLiquidityPosition[]> {
    const uniswapLiquidityPositions = new Map<string, IncomeLiquidityPosition[]>();
    const lpTokenAddresses = new Set(pools.items.map((pool) => pool.address.toLowerCase()));

    originAddressesArray.forEach((userAddress) => {
      const rawPositions = balances[userAddress.toLowerCase()].tokens.reduce(
        (
          positions: IncomeLiquidityPosition[],
          balance: AccountTokenBalance,
        ): IncomeLiquidityPosition[] => {
          if (!lpTokenAddresses.has(balance.token.address.toLowerCase())) {
            return positions;
          }

          const item = pools.items.find(
            (p) => p.address.toLowerCase() === balance.token.address.toLowerCase(),
          );

          positions.push(
            plainToClass(IncomeLiquidityPosition, {
              liquidityTokenBalance: balance.decimalsAmount.toString(),
              user: balance.account,
              pair: plainToClass(IncomeLiquidityPositionPair, {
                id: item.address,
                // reserveUSD: pool.TVL,
                totalSupply: item.lpToken.totalSupply,

                token0: this.formatIncomeToken(item.tokens[0]),
                reserve0: item.tokens[0].reserve,
                token0Price: item.tokens[0].price,

                token1: this.formatIncomeToken(item.tokens[1]),
                reserve1: item.tokens[1].reserve,
                token1Price: item.tokens[1].price,
              }),
            }),
          );
          return positions;
        },
        [] as IncomeLiquidityPosition[],
      );

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
    pools: NotifyPools,
    chainId: ChainIdEnum,
    multicall: SpookyswapLocalMultiCall,
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
    pools: NotifyPools,
    chainId: ChainIdEnum,
    multicall: SpookyswapLocalMultiCall,
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
