import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AutomaticMarketMaker,
  ChainDto,
  LiquidityPositionDto,
  Logger,
  PoolTokenDto,
  ProtocolNameEnum,
} from '@app/common';
import { ClaimableDto, IntegrationClaimableTokenDto } from '@app/common';
import { StakingProjectDto } from '@app/common/dto/transactions.dto';
import { FeatureEnum, PancakeProtocolEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common/enum';
import { NotifyPools, NotifyStaking } from '@app/common/jobs/notify.dto';

import { RewardsData } from '../../../chain/dto/pancake.interfaces';
import { LocalMultiCall } from '../../../chain/local.multi.call';
import { Web3Provider } from '../../../chain/web3.provider';
import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
} from '../../../integrations/integrations.dto';
import { BaseData } from '../../../interfaces/transactions.interfaces';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import {
  Balance,
  Pancakev2MainStakingSubgraph,
} from '../../../thegraph/pancakev2.main.staking.subgraph';
import { decimalsDivider } from '../../../utils/util';
import { Mapper } from '../mappers/mapper';

type BaseInfo = Omit<BaseData, 'protocolType'>;

@Injectable()
export class PancakeV2Legacy {
  private readonly masterChiefAddress = '0x73feaa1ee314f8c655e354234017be2193c9e24e';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly web3Provider: Web3Provider,
    private readonly pancakev2MainStakingSubgraph: Pancakev2MainStakingSubgraph,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    return [];
  }

  public async getDataByAddresses(addresses: string, chain: ChainDto): Promise<BaseData[]> {
    const base: BaseData[] = [];
    const baseInfo: BaseInfo = {
      chain,
      projectName: ProjectEnum.pancake,
      protocolName: ProtocolNameEnum.pancakeV2,
      userAddress: '',
    };
    const staking: StakingProjectDto = Mapper.createDynamicFeature<StakingProjectDto>(
      baseInfo,
      ProtocolTypeEnum.staking,
    );
    const pools = Mapper.createDynamicFeature<AutomaticMarketMaker>(baseInfo, ProtocolTypeEnum.amm);

    const originAddressesArray = addresses.toLowerCase().split(',');

    const [liquidityPositions, stakingPositions] = await Promise.all([
      this.getLiquidityPostions(originAddressesArray, chain),
      this.getStakingPositions(originAddressesArray, chain),
    ]);

    const tokenToGetPrices: Set<string> = new Set<string>();
    stakingPositions.forEach((sp) => {
      if (sp.stakingToken.tokens) {
        sp.stakingToken.tokens.forEach((spt) => {
          tokenToGetPrices.add(spt.address);
        });
      } else {
        // if token is not lp find its price
        tokenToGetPrices.add(sp.stakingToken.address);
      }
      tokenToGetPrices.add(sp.rewardToken.address);
    });
    liquidityPositions.forEach((lp) => {
      lp.poolTokens.map((pt) => {
        tokenToGetPrices.add(pt.address);
      });
    });
    //
    const { prices } = await this.priceService.getTokenPricesFetch(
      Array.from(tokenToGetPrices),
      chain.id,
    );

    stakingPositions.forEach((sp) => {
      if (sp.stakingToken.tokens.length === 0) {
        sp.stakingToken.price = prices[sp.stakingToken.address];
        sp.stakingToken.value =
          Number(sp.stakingToken.balance) * Number(prices[sp.stakingToken.address]);
      } else {
        sp.stakingToken.tokens.forEach((spt) => {
          spt.price = Number(prices[spt.address]);
          spt.value = Number(spt.balance) * Number(prices[spt.address]);
        });
      }
      sp.rewardToken.price = Number(prices[sp.rewardToken.address]);
      sp.rewardToken.claimableData.value =
        Number(sp.rewardToken.claimableData.balance) * Number(prices[sp.rewardToken.address]);
    });
    staking.stakingPositions = stakingPositions;

    liquidityPositions.forEach((lp) => {
      lp.poolTokens.forEach((lpt) => {
        lpt.price = Number(prices[lpt.address]);
        lpt.value = Number(lpt.balance) * Number(prices[lpt.address]);
        lp.user.value = lp.user.value ? lp.user.value : 0;
        lp.user.value += lpt.value;
      });
    });
    pools.liquidityPositions = liquidityPositions;

    base.push(staking);
    base.push(pools);

    return base;
  }

  private async getStakingPositions(
    addresses: string[],
    chain: ChainDto,
  ): Promise<IntegrationStakingPositionDto[]> {
    const stakingPositions: IntegrationStakingPositionDto[] = [];

    const key = `${chain.id}_${PancakeProtocolEnum.pancakeV2}_${FeatureEnum.staking}`;

    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const web3Provider = this.web3Provider.getForChain(chain.abbr);
    const multicall = new LocalMultiCall(web3Provider, this.logger);

    let balances: Balance[] = await this.pancakev2MainStakingSubgraph.getBalances(addresses);
    balances = balances.filter((b) => Number(b.balance) > 0);

    const claimableRewardsData: RewardsData[] = [];
    balances.forEach((b) => {
      claimableRewardsData.push({
        poolId: Number(b.id.split('-')[1]),
        userAddress: b.user.id,
      });
    });

    const claimableRewards: RewardsData[] = await multicall.getPendingCake(
      claimableRewardsData,
      this.masterChiefAddress,
    );

    balances.forEach((b) => {
      const balancePoolId = Number(b.id.split('-')[1]);
      const cachedPoolData = pools.items.find((sp) => Number(sp.poolId) === balancePoolId);

      if (cachedPoolData) {
        const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
          address: cachedPoolData.stakingToken.address,
          name: cachedPoolData.stakingToken.name,
          symbol: cachedPoolData.stakingToken.symbol,
          decimals: cachedPoolData.stakingToken.decimals,
          totalSupply: cachedPoolData.stakingToken.totalSupply,
        });

        const rewardToken: IntegrationClaimableTokenDto = plainToClass(
          IntegrationClaimableTokenDto,
          {
            address: cachedPoolData['rewards'][0].address,
            name: cachedPoolData['rewards'][0].name,
            symbol: cachedPoolData['rewards'][0].symbol,
            decimals: cachedPoolData['rewards'][0].decimals,
            totalSupply: cachedPoolData['rewards'][0].totalSupply,
          },
        );

        const stakedBigNumber = new BigNumber(b.balance).div(
          decimalsDivider(stakingToken.decimals),
        );
        stakingToken.balance = stakedBigNumber.toString();

        if (cachedPoolData.stakingToken.tokens) {
          stakingToken.tokens = [];
          const poolShare = stakedBigNumber.div(new BigNumber(stakingToken.totalSupply));
          cachedPoolData.stakingToken.tokens.forEach((clpt) => {
            const poolTokenToAdd: PoolTokenDto = plainToClass(PoolTokenDto, {
              address: clpt.address,
              name: clpt.name,
              symbol: clpt.symbol,
              decimals: clpt.decimals,
              reserve: clpt.reserve,
              balance: poolShare.times(new BigNumber(clpt.reserve)).toString(),
            });
            stakingToken.tokens.push(poolTokenToAdd);
          });
        }

        const stakingPosition: IntegrationStakingPositionDto = plainToClass(
          IntegrationStakingPositionDto,
          {
            address: cachedPoolData.address,
            poolId: cachedPoolData.poolId,
            staked: b.balance,
            stakingToken: stakingToken,
            rewardToken: rewardToken,
          },
        );

        // find and set claimable rewards:
        const claimableReward = claimableRewards.find(
          (cr) => cr.userAddress === b.user.id && cr.poolId === balancePoolId,
        );
        if (claimableReward) {
          stakingPosition.rewardToken.claimableData = plainToClass(ClaimableDto, {});
          stakingPosition.rewardToken.claimableData.balance = claimableReward.pendingCake
            .div(decimalsDivider(stakingPosition.rewardToken.decimals))
            .toString();
        }

        stakingPositions.push(stakingPosition);
      }
    });

    return stakingPositions;
  }

  private async getLiquidityPostions(
    originAddressesArray: string[],
    chain: ChainDto,
  ): Promise<any[]> {
    // in this case we handle only one address:
    const address = originAddressesArray[0];
    const liquidityPosition = [];

    const key = `${chain.id}_${PancakeProtocolEnum.pancakeV2}_${FeatureEnum.pools}`;
    const pools: NotifyPools = await this.cache.get(key);
    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const lpTokenAddresses = pools.items.map((p) => p.address);
    const lpTokenBalances = await this.accountService.getBalancesPost(
      [address],
      [chain.id],
      lpTokenAddresses,
    );

    lpTokenBalances[address].tokens.forEach((tb) => {
      const cachedPoolData = pools.items.find((lp) => lp.address === tb.token.address);
      const poolShare = tb.decimalsAmount / cachedPoolData.lpToken.totalSupply;
      const userLiquidityPos: LiquidityPositionDto = plainToClass(LiquidityPositionDto, {
        address: tb.token.address,
        name: null,
        lpToken: {
          address: tb.token.address,
          name: tb.token.name,
          symbol: tb.token.symbol,
          decimals: tb.token.decimals,
          totalSupply: cachedPoolData.lpToken.totalSupply,
        },
        TVL: cachedPoolData.stats.tvl,
        fee: cachedPoolData.stats.feeRate,
        statistic: null,
        user: {
          value: null,
          share: poolShare,
        },
        poolTokens: cachedPoolData.tokens.map((pt) => {
          return {
            address: pt.address,
            name: pt.name,
            symbol: pt.symbol,
            decimals: pt.decimals,
            reserve: pt.reserve.toString(),
            value: null,
            balance: (poolShare * pt.reserve).toString(),
            price: null,
          };
        }),
      });
      liquidityPosition.push(userLiquidityPos);
    });

    return liquidityPosition;
  }
}
