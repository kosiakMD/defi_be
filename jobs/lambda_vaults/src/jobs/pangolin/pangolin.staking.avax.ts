import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, CurrencyIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toDecimals } from '../../utils/number';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { StakingFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { calculateAPR } from '../utils/apr';
import { Abis } from './abis';
import { PangolinAddresses } from './addresses';

export class PangolinStakingAvax implements JobInterface {
  chain = ChainIdEnum.avax;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.pangolin;

  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping = [];
  private availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallAggregator,
    private readonly priceService: PriceService,
  ) {
    this.availableDtosForConversion = new Map<string, string>([
      [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
      [IntegrationERC20TokenDto.name, ERC20Token.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (!jobMapping.mapping) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  /** completed for masterchief contract */
  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    const [pngRewardDto, apeinRewardDto] = await Promise.all([
      this.accountService.saveTrackingAsset(PangolinAddresses.png, this.chain),
      this.accountService.saveTrackingAsset(PangolinAddresses.apein, this.chain),
    ]);

    const rewardPng = plainToClass(IntegrationClaimableTokenDto, {
      address: pngRewardDto.address,
      name: pngRewardDto.name,
      symbol: pngRewardDto.symbol,
      decimals: pngRewardDto.decimals,
    });

    const rewardApein = plainToClass(IntegrationClaimableTokenDto, {
      address: apeinRewardDto.address,
      name: apeinRewardDto.name,
      symbol: apeinRewardDto.symbol,
      decimals: apeinRewardDto.decimals,
    });

    const poolsInfo: Map<string, any> = await this.getAllPoolInfo(PangolinAddresses.chief);

    // use while one address for test
    for (const address of poolsInfo.keys()) {
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
          stakingToken.tokens = [];
          poolTokenData.underlyingAssets.forEach((pt) => {
            const poolToken: IntegrationPoolTokenDto = plainToClass(IntegrationPoolTokenDto, {
              address: pt.address,
              name: pt.name,
              symbol: pt.symbol,
              decimals: pt.decimals,
              positionInPool: pt.positionInPool,
            });
            stakingToken.tokens.push(poolToken);
          });
        }

        const stakingPoolFeature: IntegrationStakingPositionDto = plainToClass(
          IntegrationStakingPositionDto,
          {
            address: PangolinAddresses.chief,
            poolId: poolsInfo.get(address).id.toString(),
            poolName: null,
            rewards: [rewardPng],
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
    }

    stakingFeatures.push(
      PangolinStakingAvax.getPngStakingFeature(
        rewardPng,
        pngRewardDto,
        PangolinAddresses.pngStaker,
      ),
    );
    stakingFeatures.push(
      PangolinStakingAvax.getPngStakingFeature(
        rewardApein,
        pngRewardDto,
        PangolinAddresses.apeinStaker,
      ),
    );

    const mappings = [];
    for (let i = 0; i < stakingFeatures.length; i++) {
      mappings.push(await this.toDbMapping(stakingFeatures[i]));
    }

    jobMapping.mapping = mappings;

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  private static getPngStakingFeature(
    reward: IntegrationClaimableTokenDto,
    stakingToken: LiquidityPoolTokenDto,
    stakerAddress: string,
  ): IntegrationStakingPositionDto {
    return plainToClass(IntegrationStakingPositionDto, {
      address: stakerAddress,
      poolId: null,
      poolName: null,
      rewards: [reward],
      stakingToken: plainToClass(IntegrationERC20TokenDto, {
        address: stakingToken.address,
        name: stakingToken.name,
        symbol: stakingToken.symbol,
        decimals: stakingToken.decimals,
      }),
    });
  }

  private async getAllPoolInfo(stakerContract: PangolinAddresses): Promise<Map<string, any>> {
    const poolsInfoMap = new Map<string, any>();
    const [poolLength, poolsLpTokens] = [
      (await this.getChainPoolLength()).toNumber(),
      await this.getPoolsLpTokens(),
    ];

    const calls = new Map<string, CallData>();
    for (let i = 0; i < poolLength; i++) {
      const mappedDTO = plainToClass(IntegrationStakingPositionDto, {});
      mappedDTO.poolId = i;

      calls.set(PangolinStakingAvax.poolInfoLabel(mappedDTO.poolId), {
        address: stakerContract,
        abi: Abis.poolInfo,
        input: {
          data: [i],
        },
        output: {},
      });
    }

    const poolInfos = await this.multicallService.handleInBatches(calls, this.chain);

    let i = 0;
    for (const poolInfo of poolInfos.values()) {
      const lpToken = poolsLpTokens[i].toLowerCase();
      poolsInfoMap.set(lpToken, {
        id: i,
        lpToken,
        allocPoint: poolInfo.output.data.allocPoint,
        lastRewardTime: poolInfo.output.data.lastRewardTime,
        accRewardPerShare: poolInfo.output.data.accRewardPerShare,
      });
      i++;
    }

    return poolsInfoMap;
  }

  private async toDbMapping(stakingPosition: IntegrationStakingPositionDto) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});

    /** reward token */
    const rewardTokenUniqueId = concatStrings(this.chain, stakingPosition.rewards[0].address);
    const rewardTokenItem: TrackedVaultItem = await this.getDbItem(
      stakingPosition.rewards[0],
      rewardTokenUniqueId,
    );
    mappedDto.rewards = [
      {
        dbId: rewardTokenItem.id,
        dtoName: stakingPosition.rewards[0].constructor.name,
      },
    ];

    /** staking token */
    const stakingTokenUniqueId = concatStrings(this.chain, stakingPosition.stakingToken.address);
    const stakingToken: TrackedVaultItem = await this.getDbItem(
      stakingPosition.stakingToken,
      stakingTokenUniqueId,
    );
    mappedDto.stakingToken = {
      dbId: stakingToken.id,
      dtoName: stakingPosition.stakingToken.constructor.name,
    };

    /** staking lp assets underlying */
    if (stakingPosition.stakingToken.tokens) {
      mappedDto.stakingToken.tokens = [];
      for (const t of stakingPosition.stakingToken.tokens) {
        const tokenId = concatStrings(this.chain, t.address);
        const tokenItem: TrackedVaultItem = await this.getDbItem(t, tokenId);
        mappedDto.stakingToken.tokens.push({
          dbId: tokenItem.id,
          dtoName: t.constructor.name,
          positionInPool: t.positionInPool,
        });
      }
    }

    /** position */
    const positionUniqueId = concatStrings(
      this.chain,
      stakingPosition.address,
      stakingPosition.poolId,
    );
    const position: TrackedVaultItem = await this.getDbItem(stakingPosition, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = stakingPosition.constructor.name;

    return mappedDto;
  }

  async getDbItem(item, uniqueId: string): Promise<TrackedVaultItem> {
    const temp = TrackedVaultItemsMap.get(uniqueId);
    return temp ?? (await this.saveItemToDb(item, uniqueId));
  }

  private async getPoolsLpTokens() {
    const call = new Map<string, CallData>([
      [
        PangolinStakingAvax.getLpTokensLabel(),
        {
          address: PangolinAddresses.chief,
          abi: Abis.lpTokens,
          input: {
            data: [],
          },
          output: {},
        },
      ],
    ]);

    const callRsp = await this.multicallService.handleInBatches(call, this.chain);
    return callRsp.get(PangolinStakingAvax.getLpTokensLabel()).output.data;
  }

  private async getChainPoolLength(): Promise<BigNumber> {
    const call = new Map<string, CallData>([
      [
        PangolinStakingAvax.poolLengthLabel(),
        {
          address: PangolinAddresses.chief,
          abi: Abis.poolLength,
          input: {
            data: [],
          },
          output: {},
        },
      ],
    ]);
    const callRsp = await this.multicallService.handleInBatches(call, this.chain);

    return callRsp.get(PangolinStakingAvax.poolLengthLabel()).output.data;
  }

  async saveItemToDb(item, uniqueId: string): Promise<TrackedVaultItem> {
    let universalDto;

    const newIntegrationJobItem: TrackedVaultItem = plainToClass(TrackedVaultItem, {});
    const toUniversalDtoName = this.availableDtosForConversion.get(item.constructor.name);
    newIntegrationJobItem.type = toUniversalDtoName;

    if (toUniversalDtoName === ERC20Token.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }
    if (toUniversalDtoName === IntegrationStakingPositionDto.name) {
      universalDto = {
        address: item.address,
        poolId: item.poolId,
        poolName: item.poolName,
      };
      newIntegrationJobItem.name = universalDto.poolName
        ? universalDto.poolName
        : universalDto.poolId;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    newIntegrationJobItem.data = classToPlain(universalDto);
    const savedItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);
    // it is important to add item to database
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  async updateWithChainData(): Promise<any[]> {
    let batchCallsMap: Map<string, CallData> = new Map<string, CallData>();

    // await Promise.all(
    this.mapping.map(async (m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        batchCallsMap = new Map<string, CallData>([
          ...batchCallsMap.entries(),
          ...this.getCallsForPool(m).entries(),
        ]);
      }
    });
    // );
    batchCallsMap = new Map<string, CallData>([
      ...batchCallsMap.entries(),
      ...this.getCallsForChief().entries(),
    ]);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(
        pricedTokenAddresses,
        CurrencyIdEnum.usd,
        this.chain,
        this.protocol,
      ),
      this.multicallService.handleInBatches(batchCallsMap, this.chain),
    ]);

    const totalAllocPoint: BigNumber = multicallRsp.get(PangolinStakingAvax.totalAllocPointLabel())
      .output.data;
    const rewardPerSecond: BigNumber = multicallRsp.get(
      PangolinStakingAvax.getRewardPerSecondLabel(),
    ).output.data;

    this.mapping = this.mapping.map((m) => {
      try {
        if (m instanceof IntegrationStakingPositionDto) {
          const balance: BigNumber = multicallRsp.get(PangolinStakingAvax.balanceOfLabel(m)).output
            .data;
          m.staked = toDecimals(balance, m.stakingToken.decimals).toString();
          m.stakingToken.balance = toDecimals(balance, m.stakingToken.decimals);

          // m.p
          if (m.stakingToken.tokens?.length) {
            const totalSupply: BigNumber = multicallRsp.get(PangolinStakingAvax.totalSupplyLabel(m))
              .output.data;
            m.stakingToken.totalSupply = toDecimals(totalSupply, m.stakingToken.decimals);
            const poolShare = m.stakingToken.balance / m.stakingToken.totalSupply;
            const { _reserve0, _reserve1 } = multicallRsp.get(
              PangolinStakingAvax.getReservesLabel(m),
            ).output.data;
            m.stakingToken.tokens.map((t) => {
              t.reserve =
                t.positionInPool === 0
                  ? toDecimals(_reserve0, t.decimals)
                  : toDecimals(_reserve1, t.decimals);
              t.price = Number(prices[t.address]);
              t.balance = t.reserve * poolShare;
              t.value = t.balance * t.price;

              m.stats.tvl += t.value;

              return t;
            });

            m.rewards[0].price = Number(prices[m.rewards[0].address]);

            const { allocPoint } = multicallRsp.get(PangolinStakingAvax.poolInfoLabel(m.poolId))
              .output.data;

            const aprStats = {
              totalAllocPoints: totalAllocPoint,
              poolAllocPoints: allocPoint,
              rewardTokenPerBlock: toDecimals(rewardPerSecond, m.rewards[0].decimals),
              rewardTokenPrice: m.rewards[0].price,
              blockTime: 1, //rewards are per second, not per block
              farmingPoolTVL: m.stats.tvl,
            };
            m.rewards[0].apr = calculateAPR(aprStats);
          } else {
            m.stakingToken.price = Number(prices[m.stakingToken.address]);
            m.stakingToken.value = m.stakingToken.balance * m.stakingToken.price;
            m.stats.tvl += m.stakingToken.value;
          }

          m.rewards[0].price = Number(prices[m.rewards[0].address]);
          return m;
        }
      } catch (e) {
        this.logger.error(e, 'Error during map staking positions');
      }
    });

    return this.mapping;
  }

  private getCallsForPool(stakingPosition: IntegrationStakingPositionDto) {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    // reserves of lp token
    if (stakingPosition.stakingToken.tokens?.length) {
      calls.set(PangolinStakingAvax.getReservesLabel(stakingPosition), {
        address: stakingPosition.stakingToken.address,
        abi: Abis.getReserves,
        input: {
          data: [],
        },
        output: {},
      });
    }
    // total supply supply of staking token
    calls.set(PangolinStakingAvax.totalSupplyLabel(stakingPosition), {
      address: stakingPosition.stakingToken.address,
      abi: Abis.totalSupply,
      input: {
        data: [],
      },
      output: {},
    });

    // balance of lp token on masterchief contract
    calls.set(PangolinStakingAvax.balanceOfLabel(stakingPosition), {
      address: stakingPosition.stakingToken.address,
      abi: Abis.balanceOf,
      input: {
        data: [stakingPosition.address],
      },
      output: {},
    });

    if (stakingPosition.poolId) {
      // poolInfo to calculate APR
      calls.set(PangolinStakingAvax.poolInfoLabel(stakingPosition.poolId), {
        address: PangolinAddresses.chief,
        abi: Abis.poolInfo,
        input: {
          data: [stakingPosition.poolId],
        },
        output: {},
      });
    }

    return calls;
  }

  private getCallsForChief() {
    return new Map<string, CallData>([
      [
        PangolinStakingAvax.totalAllocPointLabel(),
        {
          address: PangolinAddresses.chief,
          abi: Abis.totalAllocPoint,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        PangolinStakingAvax.getRewardPerSecondLabel(),
        {
          address: PangolinAddresses.chief,
          abi: Abis.rewardPerSecond,
          input: {
            data: [],
          },
          output: {},
        },
      ],
    ]);
  }

  private getPricedTokensSet(): Set<string> {
    try {
      const addressesSet: Set<string> = new Set<string>();
      this.mapping.forEach((m) => {
        if (m instanceof IntegrationStakingPositionDto) {
          if (m.stakingToken.tokens?.length) {
            m.stakingToken.tokens.forEach((t) => {
              addressesSet.add(t.address);
            });
          }
        } else {
          addressesSet.add(m.stakingToken.address);
        }
        addressesSet.add(m.rewards[0].address);
      });
      return addressesSet;
    } catch (e) {
      this.logger.error(e, 'getPricedTokensSet');
    }
  }

  private static getReservesLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.getReserves.name, stakingPosition.stakingToken.address);
  }

  private static getLpTokensLabel() {
    return concatStrings(Abis.lpTokens.name, PangolinAddresses.chief);
  }

  private static totalSupplyLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.totalSupply.name, stakingPosition.stakingToken.address);
  }

  private static balanceOfLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(
      Abis.balanceOf.name,
      PangolinAddresses.chief,
      stakingPosition.stakingToken.address,
    );
  }

  private static poolInfoLabel(positionId: number) {
    return concatStrings(Abis.poolInfo.name, PangolinAddresses.chief, positionId);
  }

  private static totalAllocPointLabel() {
    return concatStrings(Abis.totalAllocPoint.name, PangolinAddresses.chief);
  }

  private static getRewardPerSecondLabel() {
    return concatStrings(Abis.rewardPerSecond.name, PangolinAddresses.chief);
  }

  private static poolLengthLabel() {
    return concatStrings(Abis.poolLength.name, PangolinAddresses.chief);
  }
}
