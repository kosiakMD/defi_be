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
import { CVX_REWARD_POOL_ADDRESS } from '@app/common/constant/protocols/convex.constants';
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
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IStakingFetcher } from './convex.interfaces';

@Injectable()
export class ConvexCvxStaking implements IStakingFetcher {
  constructor(
    private readonly multicallService: MulticallAggregator,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${ProtocolNameEnum.Convex}_${FeatureEnum.staking}`;
    const pools: NotifyStaking = await this.cache.get(key);
    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const cvxStakingPool = pools.items.find((pool) => pool.address === CVX_REWARD_POOL_ADDRESS);

    const cvxRewardPoolContract = new CvxRewardPool(CVX_REWARD_POOL_ADDRESS);

    const calls = new Map(
      addresses.flatMap((address) => [
        [`${address}-balance`, cvxRewardPoolContract.balanceOf(address)],
        [`${address}-pending`, cvxRewardPoolContract.earned(address)],
      ]),
    );

    const multicallResults = await this.multicallService.handleInBatches(calls, chain.id);

    const stakingToken = cvxStakingPool.stakingToken;
    const rewardToken = cvxStakingPool.rewards[0];

    return addresses.map((address) => {
      const items = [];

      const cvxStakeItem = this.getCvxStakeItem(
        address,
        cvxStakingPool,
        stakingToken,
        rewardToken,
        multicallResults,
      );

      if (
        cvxStakeItem.stakingToken.balance ||
        cvxStakeItem.rewards.some((reward) => reward.claimableData.balance)
      ) {
        items.push(cvxStakeItem);
      }
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

  getCvxStakeItem(
    address: Address,
    cvxStakingPool: IntegrationStakingPositionDto,
    stakingToken: IntegrationERC20TokenDto,
    rewardToken: IntegrationClaimableTokenDto,
    multicallResults: Map<string, CallData>,
  ) {
    return {
      address: CVX_REWARD_POOL_ADDRESS,
      poolId: null,
      poolName: 'CVX',
      staked: multicallResults.get(`${address}-balance`).output.data.toString(),
      stats: cvxStakingPool.stats, // FROM POOL
      stakingToken: this.createStakingToken(
        stakingToken,
        normalizeDecimals(
          multicallResults.get(`${address}-balance`).output.data.toString(),
          stakingToken.decimals,
        ),
      ),
      rewards: [
        this.createClaimableRewardToken(
          rewardToken,
          normalizeDecimals(
            multicallResults.get(`${address}-pending`).output.data.toString(),
            rewardToken.decimals,
          ),
        ),
      ],
    };
  }

  private createStakingToken(
    token: IntegrationERC20TokenDto,
    balance: number,
  ): IntegrationERC20TokenDto {
    return plainToClass(IntegrationERC20TokenDto, {
      // ERC20
      address: token.address, // CVX_ADDRESS
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      totalSupply: token.totalSupply,

      // Extras
      price: token.price,

      // User
      balance: balance,
      value: balance * token.price,
    });
  }

  private createClaimableRewardToken(
    token: IntegrationClaimableTokenDto,
    balance: number,
  ): IntegrationClaimableTokenDto {
    return plainToClass(IntegrationClaimableTokenDto, {
      // ERC20
      address: token.address, // CVX_CRV_ADDRESS
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
}
