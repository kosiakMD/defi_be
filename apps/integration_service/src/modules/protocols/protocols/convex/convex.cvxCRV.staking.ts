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
  CRVCVX_REWARD_POOL_ADDRESS,
  CVX_REWARD_POOL_ADDRESS,
} from '@app/common/constant/protocols/convex.constants';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import {
  ClaimableDto,
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
} from '@app/common/jobs/staking';
import { normalizeDecimals } from '@app/common/utils';
import { CvxRewardPool } from '@app/common/web3provider/contracts/protocols/convex/CvxRewardPool';
import { VirtualBalanceRewardPool } from '@app/common/web3provider/contracts/protocols/convex/VirtualBalanceRewardPool';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IStakingFetcher } from './convex.interfaces';

@Injectable()
export class ConvexCvxCRVStaking implements IStakingFetcher {
  constructor(
    private readonly multicallService: MulticallAggregator,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const key = `${chain.id}_${ProtocolNameEnum.Convex}_${FeatureEnum.staking}`;
    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const cvxCrvStakingPool = pools.items.find(
      (pool) => pool.address === CRVCVX_REWARD_POOL_ADDRESS,
    );

    const cvxRewardPoolContract = new CvxRewardPool(CRVCVX_REWARD_POOL_ADDRESS);

    const baseContractCalls = new Map(
      addresses.flatMap((address) => [
        [`balanceOf(${address})`, cvxRewardPoolContract.balanceOf(address)],
        [`earned(${address})`, cvxRewardPoolContract.earned(address)],
        ['extraRewardsLength', cvxRewardPoolContract.extraRewardsLength()],
      ]),
    );

    const baseContractResults = await this.multicallService.handleInBatches(
      baseContractCalls,
      chain.id,
    );

    const length = parseInt(
      baseContractResults.get('extraRewardsLength').output.data.toString(),
      10,
    );
    const extraRewardAddressCalls = new Map(
      Array.from(Array(length).keys()).map((poolId) => {
        return [`extraRewards(${poolId})`, cvxRewardPoolContract.extraRewards(poolId)];
      }),
    );

    const extraRewardAddressResults = await this.multicallService.handleInBatches(
      extraRewardAddressCalls,
      chain.id,
    );

    const extraRewardCalls = new Map(
      Array.from(extraRewardAddressResults.values()).flatMap((virtualRewardAddressCallData) => {
        const virtualRewardPool = virtualRewardAddressCallData.output.data.toString().toLowerCase();
        const contract = new VirtualBalanceRewardPool(virtualRewardPool);
        const calls: [string, any][] = addresses.map((address) => [
          `${virtualRewardPool}-earned(${address})`,
          contract.earned(address),
        ]);

        calls.push([`${virtualRewardPool}-rewardToken`, contract.rewardToken()]);

        return calls;
      }),
    );

    const earnedRewardResults = await this.multicallService.handleInBatches(
      extraRewardCalls,
      chain.id,
    );

    const stakingToken = cvxCrvStakingPool.stakingToken; // From Vaults Job or api
    const rewardTokens = cvxCrvStakingPool.rewards; // From Vaults Job or Api

    const getRewards = (address: string) =>
      Array.from(extraRewardAddressResults.values()).map((virtualPoolAddress) => {
        const rewardPool = virtualPoolAddress.output.data.toString().toLowerCase();
        const rewardAddress = earnedRewardResults
          .get(`${rewardPool}-rewardToken`)
          .output.data.toString()
          .toLowerCase();
        const rewardToken = rewardTokens.find((r) => r.address === rewardAddress);
        return this.createClaimableRewardToken(
          rewardToken,
          normalizeDecimals(
            earnedRewardResults.get(`${rewardPool}-earned(${address})`).output.data.toString(),
            rewardToken.decimals,
          ),
        );
      });

    return addresses.map((address) => {
      return plainToClass(BaseDataStaking, {
        chain,
        userAddress: address,
        protocolType: ProtocolTypeEnum.staking,
        projectName: ProjectEnum.convex,
        feature: FeatureEnum.staking,
        protocolName: ProtocolNameEnum.Convex,
        items: [
          {
            address: CVX_REWARD_POOL_ADDRESS,
            poolId: null,
            poolName: 'CVX',
            staked: baseContractResults.get(`balanceOf(${address})`).output.data.toString(),
            stats: cvxCrvStakingPool.stats, // FROM POOL
            stakingToken: this.createStakingToken(
              stakingToken,
              normalizeDecimals(
                baseContractResults.get(`balanceOf(${address})`).output.data.toString(),
                stakingToken.decimals,
              ),
            ),
            rewards: getRewards(address),
          },
        ],
      });
    });
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
