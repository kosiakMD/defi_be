import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import Web3 from 'web3';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ClaimableDto,
  ICallData,
  IntegrationClaimableTokenDto,
  Logger,
  PoolTokenDto,
  ProtocolNameEnum,
} from '@app/common';
import {
  FeatureEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  TraderjoeProtocolEnum,
} from '@app/common/enum';
import { NotifyStaking } from '@app/common/jobs/notify.dto';
import { concatStrings } from '@app/common/utils';

import { RewardsData as RewardsDataTraderJoe } from '../../../chain/dto/traderjoe.interfaces';
import { LocalMultiCall } from '../../../chain/local.multi.call';
import { MulticallProvider } from '../../../chain/multicall.provider';
import { MulticallService } from '../../../chain/multicall.service';
import { Web3Provider, Web3Provider as Web3ProviderLocal } from '../../../chain/web3.provider';
import {
  IntegrationERC20TokenDto,
} from '../../../integrations/integrations.dto';
import { PriceService } from '../../../microservices/price.service';
import { Balance } from '../../../thegraph/pancakev2.main.staking.subgraph';
import { decimalsDivider } from '../../../utils/util';
import { Abis } from './abis';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { IntegrationStakingPositionDto } from '@app/common/jobs/staking';

@Injectable()
export class TraderJoeStaking {
  private readonly masterChiefAddressV2 = '0xd6a4f121ca35509af06a0be99093d08462f53052';
  private readonly masterChiefAddressV3 = '0x188bed1968b795d5c9022f6a0bb5931ac4c18f00';
  private readonly multicallService: MulticallService;
  private readonly web3Provider: Web3;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly configService: ConfigService,
    private readonly web3ProviderLocal: Web3ProviderLocal,
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
    private readonly web3: Web3Provider,
  ) {
    this.web3Provider = web3.getForChain(ChainAbbrEnum.avax);
    this.multicallService = multicallProvider.getForChain(ChainAbbrEnum.avax);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    const base: BaseDataStaking[] = [];

    for (const a of addresses) {
      const baseInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.traderjoe,
        protocolName: ProtocolNameEnum.traderjoe,
        userAddress: a,
        protocolType: ProtocolTypeEnum.staking,
        feature: FeatureEnum.staking,
        items: [],
      });

      const stakingPositions: IntegrationStakingPositionDto[] = await this.getStakingPositions(
        addresses,
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
        tokenToGetPrices.add(sp.rewards[0].address);
        if (sp.rewards[1]) tokenToGetPrices.add(sp.rewards[1].address);
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
        sp.rewards[0].price = Number(prices[sp.rewards[0].address]);
        sp.rewards[0].claimableData.value =
          Number(sp.rewards[0].claimableData.balance) * Number(prices[sp.rewards[0].address]);
        totalValue = totalValue + Number(sp.rewards[0].claimableData.value);
        if (sp.rewards[1]) {
          sp.rewards[1].price = Number(prices[sp.rewards[1].address]);
          sp.rewards[1].claimableData.value =
            Number(sp.rewards[1].claimableData.balance) * Number(prices[sp.rewards[1].address]);
          totalValue = totalValue + Number(sp.rewards[1].claimableData.value);
        }
      });

      baseInfo.items = stakingPositions;
      base.push(baseInfo);
    }

    return base;
  }

  private async getStakingPositions(
    addresses: string[],
    chain: ChainDto,
  ): Promise<IntegrationStakingPositionDto[]> {
    const stakingPositions: IntegrationStakingPositionDto[] = [];

    const key = `${chain.id}_${TraderjoeProtocolEnum.traderjoe}_${FeatureEnum.staking}`;

    const pools: NotifyStaking = await this.cache.get(key);

    if (!pools) {
      throw new Error(`not found cached data for '${key}'`);
    }

    const stakingPositionV2 = await this.getDataWithMulticall(
      addresses,
      chain,
      pools,
      this.masterChiefAddressV2,
    );
    const stakingPositionV3 = await this.getDataWithMulticall(
      addresses,
      chain,
      pools,
      this.masterChiefAddressV3,
    );
    stakingPositions.push(...[...stakingPositionV2, ...stakingPositionV3]);

    return stakingPositions;
  }

  private async getDataWithMulticall(addresses, chain, pools, contract) {
    const call = new Map<string, ICallData>();
    call.set(this.poolLengthLabel(contract), {
      address: contract,
      abi: Abis.poolLength,
      input: {
        data: [],
      },
      output: {},
    });

    const poolsInfo: Map<string, ICallData> = await this.multicallService.handleInBatches(call);
    const poolLengthResult = parseInt(
      poolsInfo.get(this.poolLengthLabel(contract)).output.plain,
      16,
    );

    const calls = new Map<string, ICallData>();
    for (const address of addresses) {
      for (let i = 0; i < poolLengthResult; i++) {
        calls.set(this.pendingTokensLabel(address, i), {
          address: contract,
          abi: Abis.userInfo,
          input: {
            data: [i, address],
          },
          output: {},
        });
      }
    }
    const userBalances: Map<string, ICallData> = await this.multicallService.handleInBatches(calls);

    const balances: Balance[] = [];

    for (const userBalance of userBalances.entries()) {
      if (Number(userBalance[1].output.data.amount) > 0) {
        balances.push({
          id: userBalance[0],
          balance: userBalance[1].output.data.amount,
          user: {
            id: userBalance[0].split('_')[0],
          },
        });
      }
    }

    const claimableRewardsData: RewardsDataTraderJoe[] = [];
    balances.forEach((b) => {
      claimableRewardsData.push({
        poolId: Number(b.id.split('_')[1]),
        userAddress: b.user.id,
      });
    });

    const web3ProviderLocal = this.web3ProviderLocal.getForChain(chain.abbr);
    const multicallLocal = new LocalMultiCall(web3ProviderLocal, this.logger);

    let claimableRewards: RewardsDataTraderJoe[];
    if (contract === this.masterChiefAddressV2) {
      claimableRewards = await multicallLocal.getPendingJoe(
        claimableRewardsData,
        this.masterChiefAddressV2,
      );
    } else {
      claimableRewards = await multicallLocal.getPendingJoeV3(
        claimableRewardsData,
        this.masterChiefAddressV3,
      );
    }
    const stakingPositions: IntegrationStakingPositionDto[] = [];

    balances.forEach((b) => {
      const balancePoolId = Number(b.id.split('_')[1]);
      let cachedPoolData;
      if (contract === this.masterChiefAddressV2) {
        cachedPoolData = pools.items.find(
          (sp) => Number(sp.poolId) === balancePoolId && sp.rewards.length === 1,
        );
      } else {
        cachedPoolData = pools.items.find(
          (sp) => Number(sp.poolId) === balancePoolId && sp.rewards.length === 2,
        );
      }

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
            address: cachedPoolData.rewards[0].address,
            name: cachedPoolData.rewards[0].name,
            symbol: cachedPoolData.rewards[0].symbol,
            decimals: cachedPoolData.rewards[0].decimals,
            totalSupply: cachedPoolData.rewards[0].totalSupply,
          },
        );

        let rewardTokenV3: IntegrationClaimableTokenDto;

        if (contract === this.masterChiefAddressV3) {
          rewardTokenV3 = plainToClass(IntegrationClaimableTokenDto, {
            address: cachedPoolData.rewards[1].address,
            name: cachedPoolData.rewards[1].name,
            symbol: cachedPoolData.rewards[1].symbol,
            decimals: cachedPoolData.rewards[1].decimals,
            totalSupply: cachedPoolData.rewards[1].totalSupply,
          });
        }

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

        const stakingPosition: IntegrationStakingPositionDto = plainToClass(IntegrationStakingPositionDto, {
          address: cachedPoolData.address,
          poolId: cachedPoolData.poolId,
          staked: b.balance,
          stakingToken: stakingToken,
          rewards: rewardTokenV3 ? [rewardToken, rewardTokenV3] : [rewardToken],
        });

        // find and set claimable rewards:
        const claimableReward = claimableRewards.find(
          (cr) => cr.userAddress === b.user.id && cr.poolId === balancePoolId,
        );

        if (claimableReward) {
          stakingPosition.rewards[0].claimableData = plainToClass(ClaimableDto, {});
          stakingPosition.rewards[0].claimableData.balance = claimableReward.pendingJoe
            .div(decimalsDivider(stakingPosition.rewards[0].decimals))
            .toString();

          if (contract === this.masterChiefAddressV3) {
            stakingPosition.rewards[1].claimableData = plainToClass(ClaimableDto, {});
            stakingPosition.rewards[1].address = claimableReward.bonusTokenAddress.toLowerCase();
            stakingPosition.rewards[1].claimableData.balance = claimableReward.pendingBonusToken
              .div(decimalsDivider(stakingPosition.rewards[1].decimals))
              .toString();
          }
        }

        stakingPositions.push(stakingPosition);
      }
    });

    return stakingPositions;
  }

  private poolLengthLabel(chiefContract: string) {
    return concatStrings(Abis.poolLength.name, chiefContract);
  }

  private pendingTokensLabel(address: string, poolId: number) {
    return concatStrings(address, poolId);
  }
}
