// eslint-disable-next-line max-classes-per-file
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
import { TrisolarisAddresses } from './addresses';

@Injectable()
export class TrisolarisStaking implements JobInterface {
  chain = ChainIdEnum.near;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.trisolaris;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);
  features: any;
  poolAddress2poolInfoAbi = {
    [TrisolarisAddresses.MasterChefV1StakingContract]: 'poolInfoChefV1',
    [TrisolarisAddresses.MasterChefV2StakingContract]: 'poolInfoChefV2',
  };

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

  /** completed for MCV1 and MCV2 contract */
  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    const accountTokenDto: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
      TrisolarisAddresses.tri,
      this.chain,
    );
    const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
      address: accountTokenDto.address,
      name: accountTokenDto.name,
      symbol: accountTokenDto.symbol,
      decimals: accountTokenDto.decimals,
    });

    const poolsInfo: Map<
      string,
      {
        id: number;
        lpToken: string;
        allocPoint: BigNumber;
        lastRewardBlock: BigNumber;
        accTriPerShare: BigNumber;
        poolAddress: string;
      }
    > = await this.getAllPoolInfo();

    for (const address of poolsInfo.keys()) {
      try {
        const poolTokenData = await this.accountService.saveTrackingAsset(address, this.chain);

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
            address: poolsInfo.get(address).poolAddress,
            poolId: poolsInfo.get(address).id.toString(),
            poolName: null,
            rewards: [rewardToken],
            stakingToken: stakingToken,
          },
        );

        stakingFeatures.push(stakingPoolFeature);
      } catch (e: any) {
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

  private async getAllPoolInfo(): Promise<Map<string, any>> {
    // collect pools info dor MCV1 contract
    const v1PoolLength = (
      await this.getChainPoolLength(TrisolarisAddresses.MasterChefV1StakingContract)
    ).toNumber();
    const v1PoolsInfo = await this.masterChefV1PoolsInfo(v1PoolLength);

    // collect pools info dor MCV2 contract
    const v2PoolLength = (
      await this.getChainPoolLength(TrisolarisAddresses.MasterChefV2StakingContract)
    ).toNumber();
    const v2PoolsInfo = await this.masterChefV2PoolsInfo(v2PoolLength);

    // prepare result info
    return new Map<string, any>(
      v1PoolsInfo.concat(v2PoolsInfo).map((poolInfo) => [
        poolInfo.lpToken.toLowerCase(), // covert to lower case once received!
        {
          id: poolInfo.id,
          lpToken: poolInfo.lpToken.toLowerCase(),
          allocPoint: poolInfo.allocPoint,
          lastRewardBlock: poolInfo.lastRewardBlock,
          accTriPerShare: poolInfo.accTriPerShare,
          poolAddress: poolInfo.poolAddress,
        },
      ]),
    );
  }

  async getChainPoolLength(address: TrisolarisAddresses): Promise<BigNumber> {
    const call = new Map<string, CallData>([
      [
        this.poolLengthLabel(address),
        plainToClass(CallData, {
          address,
          abi: Abis.poolLength,
        }),
      ],
    ]);
    const callRsp = await this.multicallService.handleInBatches(call, ChainIdEnum.near);
    return callRsp.get(this.poolLengthLabel(address)).output.data;
  }

  async masterChefV1PoolsInfo(poolsCount: number): Promise<any[]> {
    const calls = new Map<string, CallData>();
    const address = TrisolarisAddresses.MasterChefV1StakingContract;
    for (let i = 0; i < poolsCount; i++) {
      calls.set(
        this.poolInfoLabel(address, i),
        plainToClass(CallData, {
          address: address,
          abi: Abis.poolInfoChefV1,
          input: { data: [i] },
        }),
      );
    }

    const callsRsp = await this.multicallService.handleInBatches(calls, this.chain);

    const poolsInfo = [];
    for (let i = 0; i < poolsCount; i++) {
      poolsInfo.push({
        ...callsRsp.get(this.poolInfoLabel(address, i)).output.data,
        id: i,
        poolAddress: address,
        poolName: [TrisolarisAddresses.MasterChefV1StakingContract],
      });
    }
    return poolsInfo;
  }

  async masterChefV2PoolsInfo(poolsCount: number): Promise<any[]> {
    const calls = new Map<string, CallData>();
    const address = TrisolarisAddresses.MasterChefV2StakingContract;
    for (let i = 0; i < poolsCount; i++) {
      calls.set(
        this.poolInfoLabel(address, i),
        plainToClass(CallData, {
          address: address,
          abi: Abis.poolInfoChefV2,
          input: { data: [i] },
        }),
      );
      calls.set(
        this.lpTokenPoolLabel(i),
        plainToClass(CallData, {
          address: TrisolarisAddresses.MasterChefV2StakingContract,
          abi: Abis.lpTokenChefV2,
          input: { data: [i] },
        }),
      );
    }

    const callsRsp = await this.multicallService.handleInBatches(calls, this.chain);

    const poolsInfo = [];
    for (let i = 0; i < poolsCount; i++) {
      poolsInfo.push({
        ...callsRsp.get(this.poolInfoLabel(address, i)).output.data,
        lpToken: callsRsp.get(this.lpTokenPoolLabel(i)).output.data,
        id: i,
        poolAddress: address,
      });
    }
    return poolsInfo;
  }

  private async toDbMapping(stakingPosition: IntegrationStakingPositionDto) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});

    /** reward token */
    // todo: this unique ids must be moved to other place
    const rewardTokenUniqueId = concatStrings(this.chain, TrisolarisAddresses.tri);
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
    const temp: TrackedVaultItem = TrackedVaultItemsMap.get(uniqueId);
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
    // it is important to add item to database
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
      this.priceService.getCurrentPrices(pricedTokenAddresses, CurrencyIdEnum.usd, this.chain),
      this.multicallService.handleInBatches(batchCallsMap, this.chain),
    ]);

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

        const { allocPoint } = multicallRsp.get(this.poolInfoLabel(m.address, m)).output.data;

        const aprStats = {
          totalAllocPoints: multicallRsp.get(this.totalAllocPointLabel(m.address)).output.data,
          poolAllocPoints: allocPoint,
          rewardTokenPerBlock: toDecimals(
            multicallRsp.get(this.triPerBlockLabel(m.address)).output.data,
            m.rewards[0].decimals,
          ),
          rewardTokenPrice: m.rewards[0].price,
          blockTime: 3,
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
        data: [stakingPosition.address],
      },
      output: {},
    });

    // poolInfo to calculate APR
    calls.set(this.poolInfoLabel(stakingPosition.address, stakingPosition), {
      address: stakingPosition.address,
      abi: Abis[this.poolAddress2poolInfoAbi[stakingPosition.address]],
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
        this.totalAllocPointLabel(TrisolarisAddresses.MasterChefV1StakingContract),
        {
          address: TrisolarisAddresses.MasterChefV1StakingContract,
          abi: Abis.totalAllocPoint,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        this.totalAllocPointLabel(TrisolarisAddresses.MasterChefV2StakingContract),
        {
          address: TrisolarisAddresses.MasterChefV2StakingContract,
          abi: Abis.totalAllocPoint,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        this.triPerBlockLabel(TrisolarisAddresses.MasterChefV1StakingContract),
        {
          address: TrisolarisAddresses.MasterChefV1StakingContract,
          abi: Abis.triPerBlock,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        this.triPerBlockLabel(TrisolarisAddresses.MasterChefV2StakingContract),
        {
          address: TrisolarisAddresses.MasterChefV2StakingContract,
          abi: Abis.triPerBlock,
          input: {
            data: [],
          },
          output: {},
        },
      ],
    ]);
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
      stakingPosition.address,
      stakingPosition.stakingToken.address,
    );
  }

  poolInfoLabel(address: string, poolId) {
    return concatStrings(Abis.poolInfoChefV1.name, address, poolId);
  }

  lpTokenPoolLabel(poolId) {
    return concatStrings(
      Abis.lpTokenChefV2.name,
      TrisolarisAddresses.MasterChefV2StakingContract,
      poolId,
    );
  }

  private totalAllocPointLabel(address: string) {
    return concatStrings(Abis.totalAllocPoint.name, address);
  }

  private triPerBlockLabel(address: string) {
    return concatStrings(Abis.triPerBlock.name, address);
  }

  poolLengthLabel(address: TrisolarisAddresses) {
    return concatStrings(Abis.poolLength.name, address);
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
}
