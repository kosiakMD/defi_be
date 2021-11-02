import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainDto,
  Logger,
  NotifyPayloadStakingFeaturesDto,
  PoolTokenDto,
  ProtocolNameEnum,
} from '@app/common';
import { StakingProjectDto } from '@app/common/dto/transactions.dto';
import { FeatureEnum, PancakeProtocolEnum, ProjectEnum, ProtocolTypeEnum } from '@app/common/enum';

import { AccountService } from '../../../account/account.service';
import { RewardsData } from '../../../chain/dto/pancake.interfaces';
import { LocalMultiCall } from '../../../chain/local.multi.call';
import { Web3Provider } from '../../../chain/web3.provider';
import {
  ClaimableDto,
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
} from '../../../integrations/integrations.dto';
import { BaseData } from '../../../interfaces/transactions.interfaces';
import { PriceService } from '../../../price/price.service';
import {
  Balance,
  Pancakev2MainStakingSubgraph,
} from '../../../thegraph/pancakev2.main.staking.subgraph';
import { decimalsDivider } from '../../../utils/util';
import { Mapper } from '../mappers/mapper';

type BaseInfo = Omit<BaseData, 'protocolType'>;

@Injectable()
export class PancakeV2Service {
  private readonly masterChiefAddress = '0x73feaa1ee314f8c655e354234017be2193c9e24e';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly web3Provider: Web3Provider,
    private readonly pancakev2MainStakingSubgraph: Pancakev2MainStakingSubgraph,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
  ) {}

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

    const originAddressesArray = addresses.toLowerCase().split(',');

    const stakingPositions: IntegrationStakingPositionDto[] = await this.getStakingPositions(
      originAddressesArray,
      chain,
    );

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

    const { prices } = await this.priceService.getTokenPricesFetch(
      Array.from(tokenToGetPrices),
      chain.id,
    );

    let totalValue = 0;
    stakingPositions.map((sp) => {
      if (sp.stakingToken.tokens) {
        sp.stakingToken.tokens.map((spt) => {
          spt.price = Number(prices[spt.address]);
          spt.value = Number(spt.balance) * Number(prices[spt.address]);
          totalValue = totalValue + spt.value;
        });
      } else {
        sp.stakingToken.price = prices[sp.stakingToken.address];
        sp.stakingToken.value =
          Number(sp.stakingToken.balance) * Number(prices[sp.stakingToken.address]);
        totalValue = totalValue + sp.stakingToken.value;
      }
      sp.rewardToken.price = Number(prices[sp.rewardToken.address]);
      sp.rewardToken.claimableData.value =
        Number(sp.rewardToken.claimableData.balance) * Number(prices[sp.rewardToken.address]);
      totalValue = totalValue + Number(sp.rewardToken.claimableData.value);
    });

    staking.stakingPositions = stakingPositions;
    base.push(staking);

    return base;
  }

  private async getStakingPositions(
    addresses: string[],
    chain: ChainDto,
  ): Promise<IntegrationStakingPositionDto[]> {
    const stakingPositions: IntegrationStakingPositionDto[] = [];

    const key = `${chain.id}_${PancakeProtocolEnum.pancakeV2}_${FeatureEnum.staking}`;

    const pools: NotifyPayloadStakingFeaturesDto = await this.cache.get(key);

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
            address: cachedPoolData.rewardToken.address,
            name: cachedPoolData.rewardToken.name,
            symbol: cachedPoolData.rewardToken.symbol,
            decimals: cachedPoolData.rewardToken.decimals,
            totalSupply: cachedPoolData.rewardToken.totalSupply,
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
}
