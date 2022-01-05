// eslint-disable-next-line max-classes-per-file
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { fillUnderlyingTokens } from '../utils/token';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toDecimals } from '../../utils/number';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { StakingFeatureMapping } from '../dto/mappings';
import { JobBase } from '../job.base';
import { JobInterface } from '../job.interface';
import { calculateAPR } from '../utils/apr';
import { DefiKingdomsAddresses } from './addresses';
import { Abis } from './contracts/abis';

@Injectable()
export class DefiKingdomsStaking
  extends JobBase<IntegrationStakingPositionDto>
  implements JobInterface
{
  chain = ChainIdEnum.harm;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.defikingdoms;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  private contract: Abis;
  protected mapping = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly priceService: PriceService,
    protected readonly web3Provider: Web3ProviderService,
  ) {
    super();
    this.contract = new Abis(DefiKingdomsAddresses.masterGardener);

    this.availableDtosForConversion = new Map<string, string>([
      [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
      [IntegrationERC20TokenDto.name, ERC20Token.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
    ]);
  }

  /** completed for masterchief contract */
  async rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    const accountTokenDto: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      DefiKingdomsAddresses.jewel,
      this.chain,
    );
    const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
      address: accountTokenDto.address,
      name: accountTokenDto.name,
      symbol: accountTokenDto.symbol,
      decimals: accountTokenDto.decimals,
    });

    const poolsInfo: Map<string, any> = await this.getAllPoolInfo(
      DefiKingdomsAddresses.masterGardener,
    );

    await Promise.all(
      Array.from(poolsInfo.keys()).map(async (address) => {
        try {
          const poolTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
            address,
            this.chain,
          );

          const stakingToken: IntegrationERC20TokenDto = plainToClass(IntegrationERC20TokenDto, {
            address: poolTokenData.address,
            name: poolTokenData.name,
            symbol: poolTokenData.symbol,
            decimals: poolTokenData.decimals,
          });

          if (poolTokenData.underlyingAssets) {
            stakingToken.tokens = poolTokenData.underlyingAssets.map((pt) => {
              const poolToken: IntegrationPoolTokenDto = plainToClass(IntegrationPoolTokenDto, {
                address: pt.address,
                name: pt.name,
                symbol: pt.symbol,
                decimals: pt.decimals,
                positionInPool: pt.positionInPool,
              });
              return poolToken;
            });
          }

          const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(
            IntegrationStakingPositionDto,
            {
              address: DefiKingdomsAddresses.masterGardener,
              poolId: poolsInfo.get(address).id.toString(),
              poolName: null,
              rewards: [rewardToken],
              stakingToken: stakingToken,
            },
          );

          stakingFeatures.push(stakingPoolFeature);
        } catch (e) {
          this.logger.error(
            `error to get token data from account service, chain [${this.chain}], address [${address}]`,
            this.placeholder,
          );
        }
      }),
    );

    const mappings = await Promise.all(
      stakingFeatures.map(async (sf) => await this.toDbMapping(sf, this.chain)),
    );

    jobMapping.mapping = mappings;

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  private async getAllPoolInfo(chiefContract: DefiKingdomsAddresses): Promise<Map<string, any>> {
    const call = new Map<string, CallData>();
    call.set(this.poolLengthLabel(chiefContract), this.contract.poolLength());

    const poolsInfo: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      this.chain,
    );

    const poolLengthResult = Number(poolsInfo.get(this.poolLengthLabel(chiefContract)).output.data);

    const poolsInfoMap = new Map<string, any>();

    const calls = new Map<string, CallData>();
    for (let i = 0; i < poolLengthResult; i++) {
      const mappedDTO = plainToClass(IntegrationStakingPositionDto, {});
      mappedDTO.poolId = i;

      calls.set(this.poolInfoLabel(mappedDTO), this.contract.poolInfo(i));
    }

    const poolInfos = await this.multicallService.handleInBatches(calls, this.chain);

    let i = 0;

    poolInfos.forEach((poolInfo) => {
      poolsInfoMap.set(poolInfo.output.data.lpToken.toLowerCase(), {
        // covert to lower case once received!
        id: i,
        lpToken: poolInfo.output.data.lpToken.toLowerCase(),
        allocPoint: poolInfo.output.data.allocPoint,
        lastRewardBlock: poolInfo.output.data.lastRewardBlock,
        accGovTokenPerShare: poolInfo.output.data.accGovTokenPerShare,
      });

      i++;
    });

    return poolsInfoMap;
  }

  async toDbMapping(stakingPosition: IntegrationStakingPositionDto, chain: ChainIdEnum) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});

    mappedDto.rewards = [];

    //reward tokens

    await stakingPosition.rewards.forEach(async (reward) => {
      const rewardTokenUniqueId = concatStrings(chain, reward.address);

      const rewardTokenItem: TrackedVaultItem = await this.getDbItem(reward, rewardTokenUniqueId);

      mappedDto.rewards.push({
        dbId: rewardTokenItem.id,
        dtoName: reward.constructor.name,
      });
    });

    // staking token
    const stakingTokenUniqueId = concatStrings(chain, stakingPosition.stakingToken.address);
    const stakingToken: TrackedVaultItem = await this.getDbItem(
      stakingPosition.stakingToken,
      stakingTokenUniqueId,
    );
    mappedDto.stakingToken = {
      dbId: stakingToken.id,
      dtoName: stakingPosition.stakingToken.constructor.name,
    };

    // staking lp assets underlying
    if (stakingPosition.stakingToken.tokens) {
      mappedDto.stakingToken.tokens = [];
      for (const t of stakingPosition.stakingToken.tokens) {
        const tokenId = concatStrings(chain, t.address);
        const tokenItem: TrackedVaultItem = await this.getDbItem(t, tokenId);
        mappedDto.stakingToken.tokens.push({
          dbId: tokenItem.id,
          dtoName: t.constructor.name,
          positionInPool: t.positionInPool,
        });
      }
    }

    // position
    const positionUniqueId = concatStrings(chain, stakingPosition.address, stakingPosition.poolId);

    const position: TrackedVaultItem = await this.getDbItem(stakingPosition, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = stakingPosition.constructor.name;

    return mappedDto;
  }

  async fillChainData(): Promise<IntegrationStakingPositionDto[]> {
    const batchCalls = [];

    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        batchCalls.push(...this.getCallsForPool(m, DefiKingdomsAddresses.masterGardener).entries());
      }
    });
    batchCalls.push(...this.getCallsForChief(DefiKingdomsAddresses.masterGardener).entries());
    const batchCallsMap = new Map<string, CallData>(batchCalls);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, this.chain),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.harm),
    ]);

    const totalAllocPoint: BigNumber = multicallRsp.get(
      this.totalAllocPointLabel(DefiKingdomsAddresses.masterGardener),
    ).output.data;

    const blockTime = 2;
    const jewelsPerBlock = await this.getJewelsPerBlock();

    this.mapping = this.mapping.map((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        m = this.getDataFromMulticallRsp(
          multicallRsp,
          m,
          prices,
          DefiKingdomsAddresses.masterGardener,
        );

        const { allocPoint } = multicallRsp.get(this.poolInfoLabel(m)).output.data;

        m.rewards[0].price = Number(prices[m.rewards[0].address]);

        const aprStats = {
          totalAllocPoints: totalAllocPoint,
          poolAllocPoints: allocPoint,
          rewardTokenPerBlock: jewelsPerBlock, // DefiKingdoms has a fixed value of reward tokens per block
          rewardTokenPrice: m.rewards[0].price,
          blockTime: blockTime,
          farmingPoolTVL: m.stats.tvl,
        };

        m.rewards[0].apr = calculateAPR(aprStats);

        return m;
      }
    });

    return this.mapping;
  }

  private getDataFromMulticallRsp(
    multicallRsp,
    stakingPos: IntegrationStakingPositionDto,
    prices,
    chiefContract: DefiKingdomsAddresses,
  ) {
    const balance: BigNumber = multicallRsp.get(this.balanceOfLabel(stakingPos, chiefContract))
      .output.data;
    stakingPos.staked = toDecimals(balance, stakingPos.stakingToken.decimals).toString();
    stakingPos.stakingToken.balance = toDecimals(balance, stakingPos.stakingToken.decimals);

    // m.p
    if (stakingPos.stakingToken.tokens.length === 2) {
      const totalSupply: BigNumber = multicallRsp.get(this.totalSupplyLabel(stakingPos)).output
        .data;
      stakingPos.stakingToken.totalSupply = toDecimals(
        totalSupply,
        stakingPos.stakingToken.decimals,
      );
      const poolShare = stakingPos.stakingToken.balance / stakingPos.stakingToken.totalSupply;
      const { _reserve0, _reserve1 } = multicallRsp.get(this.getReservesLabel(stakingPos)).output
        .data;

      stakingPos.stats.tvl = fillUnderlyingTokens(stakingPos.stakingToken.tokens, [_reserve0, _reserve1], prices, poolShare);
    } else {
      stakingPos.stakingToken.price = Number(prices[stakingPos.stakingToken.address]);
      stakingPos.stakingToken.value =
        stakingPos.stakingToken.balance * stakingPos.stakingToken.price;
      stakingPos.stats.tvl += stakingPos.stakingToken.value;
    }
    return stakingPos;
  }

  private getCallsForPool(
    stakingPosition: IntegrationStakingPositionDto,
    chiefContract: DefiKingdomsAddresses,
  ) {
    const calls = new Map<string, CallData>();

    const poolContract = new Abis(stakingPosition.stakingToken.address);

    // reserves of lp token
    if (stakingPosition.stakingToken.tokens.length === 2) {
      calls.set(this.getReservesLabel(stakingPosition), poolContract.getReserves());

      // total supply supply of staking lp token
      calls.set(this.totalSupplyLabel(stakingPosition), poolContract.totalSupply());
    }

    // balance of lp token on masterchief contract
    calls.set(
      this.balanceOfLabel(stakingPosition, chiefContract),
      poolContract.balanceOf(chiefContract),
    );

    // poolInfo to calculate APR
    calls.set(this.poolInfoLabel(stakingPosition), this.contract.poolInfo(stakingPosition.poolId));

    // getNewRewardPerBlock to calculate APR
    calls.set(
      this.getNewRewardPerBlock(stakingPosition),
      this.contract.getNewRewardPerBlock(stakingPosition.poolId),
    );

    return calls;
  }

  private getCallsForChief(chiefContract: DefiKingdomsAddresses) {
    return new Map<string, CallData>([
      [this.totalAllocPointLabel(chiefContract), this.contract.totalAllocPoint()],
      [this.rewardPerBlockLabel(chiefContract), this.contract.rewardPerBlock()],
    ]);
  }

  private getPricedTokensSet(): Set<string> {
    const addressesSet: Set<string> = new Set<string>();
    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        if (m.stakingToken.tokens.length === 2) {
          m.stakingToken.tokens.forEach((t) => {
            addressesSet.add(t.address);
          });
        }
      } else {
        addressesSet.add(m.stakingToken.address);
      }

      m.rewards.forEach((r) => {
        addressesSet.add(r.address);
      });
    });
    return addressesSet;
  }

  private async getJewelsPerBlock() {
    const currentBlock = await this.web3Provider
      .getInstanceByChainId(this.chain)
      .eth.getBlockNumber();

    if (currentBlock < 20_583_967) {
      return 14;
    } else if (currentBlock < 20_886_367) {
      return 13;
    } else if (currentBlock < 21_188_767) {
      return 12;
    } else if (currentBlock < 21_491_167) {
      return 11;
    } else if (currentBlock < 21_793_567) {
      return 10;
    } else if (currentBlock < 22_095_967) {
      return 9;
    } else if (currentBlock < 26_631_967) {
      return 8;
    } else {
      return 4;
    }
  }

  private getReservesLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.getReserves.name, stakingPosition.stakingToken.address);
  }

  private totalSupplyLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.totalSupply.name, stakingPosition.stakingToken.address);
  }

  private balanceOfLabel(
    stakingPosition: IntegrationStakingPositionDto,
    chiefContract: DefiKingdomsAddresses,
  ) {
    return concatStrings(Abis.balanceOf.name, chiefContract, stakingPosition.stakingToken.address);
  }

  private poolInfoLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(
      Abis.poolInfo.name,
      DefiKingdomsAddresses.masterGardener,
      stakingPosition.poolId,
    );
  }

  private getNewRewardPerBlock(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(
      Abis.getNewRewardPerBlock.name,
      DefiKingdomsAddresses.masterGardener,
      stakingPosition.poolId,
    );
  }

  private totalAllocPointLabel(chiefContract: DefiKingdomsAddresses) {
    return concatStrings(Abis.totalAllocPoint.name, chiefContract);
  }

  private rewardPerBlockLabel(chiefContract: DefiKingdomsAddresses) {
    return concatStrings(Abis.rewardPerBlock.name, chiefContract);
  }

  private poolLengthLabel(chiefContract: DefiKingdomsAddresses) {
    return concatStrings(Abis.poolLength.name, chiefContract);
  }
}
