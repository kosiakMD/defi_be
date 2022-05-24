import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
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
import { VVSAddresses } from './addresses';

@Injectable()
export class VVSStaking implements JobInterface {
  chain = ChainIdEnum.cro;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.vvs;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;

  private mapping = [];
  private availableDtosForConversion: Map<string, string> = new Map([
    [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
    [IntegrationERC20TokenDto.name, ERC20Token.name],
    [IntegrationClaimableTokenDto.name, ERC20Token.name],
    [IntegrationPoolTokenDto.name, ERC20Token.name],
  ]);

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallAggregator,
    private readonly priceService: PriceService,
  ) {}

  public async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (!jobMapping.mapping) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);
    const stakingFeatures: IntegrationStakingPositionDto[] = [];
    const accountTokenDto: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      VVSAddresses.reward,
      this.chain,
    );
    const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
      address: accountTokenDto.address,
      name: accountTokenDto.name,
      symbol: accountTokenDto.symbol,
      decimals: accountTokenDto.decimals,
    });

    const poolsInfo: Map<string, any> = await this.getAllPoolInfo(VVSAddresses.chief);

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
            address: VVSAddresses.chief,
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
    }

    const mappings = [];
    for (let i = 0; i < stakingFeatures.length; i++) {
      mappings.push(await this.toDbMapping(stakingFeatures[i]));
    }

    jobMapping.mapping = mappings;

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  private async getAllPoolInfo(chiefContract: VVSAddresses): Promise<Map<string, any>> {
    const call = new Map<string, CallData>();
    call.set(this.poolLengthLabel(), {
      address: chiefContract,
      abi: Abis.poolLength,
      input: {
        data: [],
      },
      output: {},
    });

    const poolsInfo: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      this.chain,
    );

    const poolLengthResult = parseInt(poolsInfo.values().next().value.output.plain, 16);

    const poolsInfoMap: Map<string, any> = new Map<string, any>();
    const calls = new Map<string, CallData>();
    for (let i = 0; i < poolLengthResult; i++) {
      const mappedDTO = plainToClass(IntegrationStakingPositionDto, {});
      mappedDTO.poolId = i;

      calls.set(this.poolInfoLabel(mappedDTO), {
        address: chiefContract,
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
      poolsInfoMap.set(poolInfo.output.data.lpToken.toLowerCase(), {
        // covert to lower case once received!
        id: i,
        lpToken: poolInfo.output.data.lpToken.toLowerCase(),
        allocPoint: poolInfo.output.data.allocPoint,
        lastRewardBlock: poolInfo.output.data.lastRewardBlock,
        accCakePerShare: poolInfo.output.data.accCakePerShare,
      });

      i++;
    }

    return poolsInfoMap;
  }

  private async toDbMapping(stakingPosition: IntegrationStakingPositionDto) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});

    const rewardTokenUniqueId = concatStrings(this.chain, VVSAddresses.reward);
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
    const temp: TrackedVaultItem = TrackedVaultItemsMap.get(uniqueId) as TrackedVaultItem;
    if (temp) {
      return temp;
    }
    return await this.saveItemToDb(item, uniqueId);
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

    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }

  async updateWithChainData(): Promise<any[]> {
    let batchCallsMap: Map<string, CallData> = new Map<string, CallData>();

    this.mapping.forEach((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        batchCallsMap = new Map<string, CallData>([
          ...batchCallsMap.entries(),
          ...this.getCallsForPool(m).entries(),
        ]);
      }
    });
    batchCallsMap = new Map<string, CallData>([
      ...batchCallsMap.entries(),
      ...this.getCallsForChief().entries(),
    ]);

    const pricedTokenAddresses: string = Array.from(this.getPricedTokensSet()).join(',');

    const [{ prices }, multicallRsp] = await Promise.all([
      this.priceService.getCurrentPrices(
        pricedTokenAddresses,
        CurrencyIdEnum.usd,
        ChainIdEnum.cro,
        this.protocol,
      ),
      this.multicallService.handleInBatches(batchCallsMap, ChainIdEnum.cro),
    ]);

    const totalAllocPoint: BigNumber = multicallRsp.get(this.totalAllocPointLabel()).output.data;
    const vvsPerBlock: BigNumber = multicallRsp.get(this.vvsPerBlockLabel()).output.data;

    this.mapping = this.mapping.map((m) => {
      if (m instanceof IntegrationStakingPositionDto) {
        const balance: BigNumber = multicallRsp.get(this.balanceOfLabel(m)).output.data;
        m.staked = toDecimals(balance, m.stakingToken.decimals).toString();
        m.stakingToken.balance = toDecimals(balance, m.stakingToken.decimals);

        // m.p
        if (m.stakingToken.tokens.length === 2) {
          const totalSupply: BigNumber = multicallRsp.get(this.totalSupplyLabel(m)).output.data;
          m.stakingToken.totalSupply = toDecimals(totalSupply, m.stakingToken.decimals);
          const poolShare = m.stakingToken.balance / m.stakingToken.totalSupply;
          const { _reserve0, _reserve1 } = multicallRsp.get(this.getReservesLabel(m)).output.data;
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
        } else {
          m.stakingToken.price = Number(prices[m.stakingToken.address]);
          m.stakingToken.value = m.stakingToken.balance * m.stakingToken.price;
          m.stats.tvl += m.stakingToken.value;
        }

        m.rewards[0].price = Number(prices[m.rewards[0].address]);

        const { allocPoint } = multicallRsp.get(this.poolInfoLabel(m)).output.data;

        const aprStats = {
          totalAllocPoints: totalAllocPoint,
          poolAllocPoints: allocPoint,
          rewardTokenPerBlock: toDecimals(vvsPerBlock, m.rewards[0].decimals),
          rewardTokenPrice: m.rewards[0].price,
          blockTime: 6,
          farmingPoolTVL: m.stats.tvl,
        };
        m.rewards[0].apr = calculateAPR(aprStats);
        return m;
      }
    });

    return this.mapping;
  }

  private getCallsForPool(stakingPosition: IntegrationStakingPositionDto) {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    // reserves of lp token
    if (stakingPosition.stakingToken.tokens.length === 2) {
      calls.set(this.getReservesLabel(stakingPosition), {
        address: stakingPosition.stakingToken.address,
        abi: Abis.getReserves,
        input: {
          data: [],
        },
        output: {},
      });

      // total supply supply of staking lp token
      calls.set(this.totalSupplyLabel(stakingPosition), {
        address: stakingPosition.stakingToken.address,
        abi: Abis.totalSupply,
        input: {
          data: [],
        },
        output: {},
      });
    }

    // balance of lp token on masterchief contract
    calls.set(this.balanceOfLabel(stakingPosition), {
      address: stakingPosition.stakingToken.address,
      abi: Abis.balanceOf,
      input: {
        data: [VVSAddresses.chief],
      },
      output: {},
    });

    // poolInfo to calculate APR
    calls.set(this.poolInfoLabel(stakingPosition), {
      address: VVSAddresses.chief,
      abi: Abis.poolInfo,
      input: {
        data: [stakingPosition.poolId],
      },
      output: {},
    });

    return calls;
  }

  private getCallsForChief() {
    return new Map<string, CallData>([
      [
        this.totalAllocPointLabel(),
        {
          address: VVSAddresses.chief,
          abi: Abis.totalAllocPoint,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        this.vvsPerBlockLabel(),
        {
          address: VVSAddresses.chief,
          abi: Abis.vvsPerBlock,
          input: {
            data: [],
          },
          output: {},
        },
      ],
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
      addressesSet.add(m.rewards[0].address);
    });
    return addressesSet;
  }

  private getReservesLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.getReserves.name, stakingPosition.stakingToken.address);
  }

  private totalSupplyLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.totalSupply.name, stakingPosition.stakingToken.address);
  }

  private balanceOfLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(
      Abis.balanceOf.name,
      VVSAddresses.chief,
      stakingPosition.stakingToken.address,
    );
  }

  private poolInfoLabel(stakingPosition: IntegrationStakingPositionDto) {
    return concatStrings(Abis.poolInfo.name, VVSAddresses.chief, stakingPosition.poolId);
  }

  private totalAllocPointLabel() {
    return concatStrings(Abis.totalAllocPoint.name, VVSAddresses.chief);
  }

  private vvsPerBlockLabel() {
    return concatStrings(Abis.vvsPerBlock.name, VVSAddresses.chief);
  }

  private poolLengthLabel() {
    return concatStrings(Abis.poolLength.name, VVSAddresses.chief);
  }
}
