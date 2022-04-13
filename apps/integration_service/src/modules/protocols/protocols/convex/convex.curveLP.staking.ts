import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';

import {
  Address,
  ChainDto,
  FeatureEnum,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import {
  CRV_ADDRESS,
  CRVCVX_REWARD_POOL_ADDRESS,
  CVX_REWARD_POOL_ADDRESS,
} from '@app/common/constant/protocols/convex.constants';
import { CallData } from '@app/common/dto/CallData';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import {
  ClaimableDto,
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { normalizeDecimals } from '@app/common/utils';
import { CvxRewardPool } from '@app/common/web3provider/contracts/protocols/convex/CvxRewardPool';
import { VirtualBalanceRewardPool } from '@app/common/web3provider/contracts/protocols/convex/VirtualBalanceRewardPool';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IStakingFetcher } from './convex.interfaces';

@Injectable()
export class ConvexCurveLpStaking implements IStakingFetcher {
  constructor(
    private readonly multicallService: MulticallAggregator,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    // Test Address: 0x6e1ac9b3f4499a73385dd8d2daed6449406d49f4
    // Pool 61 - ETH-CRV
    // TX: https://etherscan.io/tx/0x870b2e6f223682894c35c15d728fab395337f47cabb371c4235818da0989dfe9

    const key = `${chain.id}_${ProtocolNameEnum.Convex}_${FeatureEnum.staking}`;
    const pools: NotifyStaking = await this.cache.get(key);
    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const usedPools = new Set<Address>();
    const allPools = new Map<Address, IntegrationStakingPositionDto>(
      pools.items.reduce((acc, cur) => {
        // These are single stakes. don't check them here
        if ([CVX_REWARD_POOL_ADDRESS, CRVCVX_REWARD_POOL_ADDRESS].includes(cur.address)) return acc;
        acc.push([cur.address.toLowerCase(), cur]);
        return acc;
      }, []),
    );

    const balanceCalls = new Map(
      addresses.flatMap((address) =>
        Array.from(allPools.values()).flatMap((pool) => {
          const baseRewardContract = new CvxRewardPool(pool.address);
          return [
            [
              ConvexCurveLpStaking.poolBalanceLabel(pool.address.toLowerCase(), address),
              baseRewardContract.balanceOf(address),
            ],
            [
              ConvexCurveLpStaking.rewardsEarned(pool.address.toLowerCase(), address, CRV_ADDRESS),
              baseRewardContract.earned(address),
            ],
          ];
        }),
      ),
    );

    const balances = await this.multicallService.handleInBatches(balanceCalls, chain.id);

    // filter only pools with balance greater than zero
    balances.forEach((value, key) => {
      const [poolAddress] = key.split('-');
      if (value.output.data.toString() !== '0') {
        usedPools.add(poolAddress.toLowerCase()); // mark that this pool has a balance for future calls
      }
    });

    // rpc call - get extra rewards Addresses
    const extraRewardsCalls = new Map();
    usedPools.forEach((poolAddress) => {
      const pool = allPools.get(poolAddress);
      const rewardsLength = pool.rewards.length - 1; // subtract one since crv rewards aren't handled in a seperate contract, and every pool has crv rewards
      Array.from(Array(rewardsLength).keys()).forEach((rewardId) => {
        const rewardPool = new CvxRewardPool(poolAddress);
        extraRewardsCalls.set(`${poolAddress}-${rewardId}`, rewardPool.extraRewards(rewardId));
      });
    });
    const extraRewards = await this.multicallService.handleInBatches(extraRewardsCalls, chain.id);

    const extraRewardBalanceCalls = new Map<Address, CallData>();
    extraRewards.forEach((rewardContract, key) => {
      const [poolAddress, poolId] = key.split('-');
      const contract = new VirtualBalanceRewardPool(rewardContract.output.data.toString());

      addresses.forEach((userAddress) => {
        extraRewardBalanceCalls.set(
          ConvexCurveLpStaking.poolRewardsEarned(poolAddress, poolId, userAddress),
          contract.earned(userAddress),
        );
      });

      extraRewardBalanceCalls.set(
        ConvexCurveLpStaking.poolTokenLabel(poolAddress, poolId),
        contract.rewardToken(),
      );
    });

    const extraRewardBalances = await this.multicallService.handleInBatches(
      extraRewardBalanceCalls,
      chain.id,
    );

    extraRewardBalances.forEach((callData, key) => {
      const [poolAddress, poolId, action, user] = key.split('-');
      // Filter out reward token, & only process earned rewards amounts
      if (action === 'token') return;

      const rewardAddress = extraRewardBalances
        .get(ConvexCurveLpStaking.poolTokenLabel(poolAddress, poolId))
        .output.data.toString()
        .toLowerCase();

      balances.set(ConvexCurveLpStaking.rewardsEarned(poolAddress, user, rewardAddress), callData);
    });

    return addresses.map((address) => {
      const items = [];
      usedPools.forEach((poolAddress) => {
        const pool = allPools.get(poolAddress);
        const balanceKey = ConvexCurveLpStaking.poolBalanceLabel(poolAddress, address);

        const balance = normalizeDecimals(
          balances.get(balanceKey).output.data.toString(),
          pool.stakingToken.decimals,
        );

        if (!pool || !balance) return;

        items.push({
          address: poolAddress,
          poolId: null,
          poolName: null,
          staked: balances.get(balanceKey).output.data.toString(),
          stats: pool.stats, // FROM POOL
          stakingToken: this.createStakingToken(pool.stakingToken, balance),

          rewards: pool.rewards.reduce((acc, reward) => {
            const token = this.createClaimableRewardToken(
              reward,
              normalizeDecimals(
                balances
                  .get(ConvexCurveLpStaking.rewardsEarned(poolAddress, address, reward.address))
                  .output.data.toString(),

                reward.decimals,
              ),
            );

            if (token.claimableData.balance) {
              acc.push(token);
            }
            return acc;
          }, []),
        });
      });

      return plainToClass(BaseDataStaking, {
        chain,
        userAddress: address,
        protocolType: ProtocolTypeEnum.staking,
        projectName: ProjectEnum.convex,
        feature: FeatureEnum.staking,
        protocolName: ProtocolNameEnum.Convex,
        items,
      });
    });
  }

  private createStakingToken(
    token: IntegrationERC20TokenDto,
    balance: number,
  ): IntegrationERC20TokenDto {
    return plainToClass(IntegrationERC20TokenDto, {
      // ERC20
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      totalSupply: token.totalSupply,
      price: token.price,
      balance: balance,
      value: balance * token.price,

      tokens: this.modifyUnderlyingTokens(token, balance),
    });
  }

  private modifyUnderlyingTokens(token: IntegrationERC20TokenDto, balance: number) {
    if (!token.tokens?.length) {
      return [];
    }
    const total = token.tokens.reduce((acc, underlying) => {
      return acc + underlying.reserve * underlying.price;
    }, 0);
    const poolValue = token.price * balance;

    return token.tokens.map((underlying) => {
      const poolShare = (underlying.price * underlying.reserve) / total;
      underlying.value = poolValue * poolShare;
      underlying.balance = underlying.value / underlying.price;

      if (underlying.tokens?.length) {
        const underlyingTotal = underlying.tokens.reduce((acc, cur) => {
          return acc + cur.value;
        }, 0);

        underlying.tokens?.forEach((t) => {
          const underlyingPoolShare = (t.price * t.reserve) / underlyingTotal;
          t.value = underlying.value * underlyingPoolShare;
          t.balance = t.value / t.price;
        });
      }
      return underlying;
    });
  }

  private createClaimableRewardToken(
    token: IntegrationClaimableTokenDto,
    balance: number,
  ): IntegrationClaimableTokenDto {
    return plainToClass(IntegrationClaimableTokenDto, {
      // ERC20
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      totalSupply: token.totalSupply,

      // Extras
      price: token.price,

      // UserData
      claimableData: plainToClass(ClaimableDto, {
        balance: balance,
        value: balance * token.price,
      }),
    });
  }

  // labels
  private static poolBalanceLabel(pool: Address, user: Address): string {
    return `${pool}-${user}-balance`;
  }

  private static rewardsEarned(pool: Address, user: Address, reward: Address): string {
    return `${pool}-${user}-${reward}-earned`;
  }
  private static poolRewardsEarned(pool: Address, poolId: string, user: Address): string {
    return `${pool}-${poolId}-earned-${user}`;
  }

  private static poolTokenLabel(pool: Address, poolId: string): string {
    return `${pool}-${poolId}-token`;
  }
}
