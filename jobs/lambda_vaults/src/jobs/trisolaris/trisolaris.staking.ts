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
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toDecimals } from '../../utils/number';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { StakingFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { ERC20TokenDto } from '../integrations.dto';
import { JobInterface } from '../job.interface';
import { Abis } from './abis';
import { TrisolarisAddresses } from './addresses';
import {
  DUMMY_LP,
  NEAR,
  STABLE_USDC_USDT,
  TRI,
  wNearTriPool,
  wNearUsdcPool,
  ZERO,
} from './trisolaris.const';

type ICalculateAprData = {
  pool: IntegrationStakingPositionDto;
  multicallRsp: any;
  triUsdRatio: number;
  poolsInfo: any;
  tvl: number;
  dataRewarders: Map<string, CallData<any>>;
  tokens: Map<string, ERC20TokenDto>;
  prices: any;
};

type IPoolInfo = Map<
  string,
  {
    id: number;
    lpToken: string;
    allocPoint: BigNumber;
    lastRewardBlock: BigNumber;
    accTriPerShare: BigNumber;
    poolAddress: string;
  }
>;

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

    const poolsInfo: IPoolInfo = await this.getAllPoolInfo();

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
            rewards: [],
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

    //filter out AAM pools
    const filteredMapping = this.mapping.filter(
      (m: IntegrationStakingPositionDto) =>
        m.stakingToken.address.toLowerCase() !== STABLE_USDC_USDT.toLowerCase(),
    );

    filteredMapping.forEach((m) => {
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
      ...this.getCallsForPoolFromCalcAPR().entries(),
    ]);

    const multicallRsp = await this.multicallService.handleInBatches(batchCallsMap, this.chain);

    //getting data of Rewarders for Pools if exists
    const { dataRewarders, tokens } = await this.getDataFromRewarder(multicallRsp);

    const pricedTokenAddresses: string = [
      ...Array.from(this.getPricedTokensSet()),
      ...Array.from(tokens.values()).map((t) => t.address),
    ].join(',');

    const { prices } = await this.priceService.getCurrentPrices(
      pricedTokenAddresses,
      CurrencyIdEnum.usd,
      this.chain,
      this.protocol,
    );

    //getting data for calculate Apr
    const { triUsdRatio, poolsInfo } = await this.getDataForCalculateAPR(prices);

    this.mapping = filteredMapping
      .filter(
        (m: IntegrationStakingPositionDto) =>
          m.stakingToken.address.toLowerCase() !== DUMMY_LP.toLowerCase(),
      )
      .map((m) => {
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

          const tokensReward = this.calculateAPR({
            pool: m,
            multicallRsp,
            triUsdRatio,
            poolsInfo,
            tvl: m.stats.tvl,
            dataRewarders,
            tokens,
            prices,
          });

          m.rewards = tokensReward.map((t) => {
            const token = tokens.get(t.token.toLowerCase());
            return plainToClass(IntegrationClaimableTokenDto, {
              address: token.address,
              name: token.name,
              symbol: token.symbol,
              decimals: token.decimals,
              price: Number(prices[t.token.toLowerCase()]),
              apr: t.apr,
            });
          });
          return m;
        }
      });

    return this.mapping;
  }

  private async getDataForCalculateAPR(prices): Promise<{
    triUsdRatio: number;
    wnearUsdRatio: number;
    poolsInfo: IPoolInfo;
  }> {
    const wnearUsdRatio = this.getDexTokenUSDRatio(NEAR.toLowerCase(), prices);
    const triUsdRatio = this.getDexTokenUSDRatio(TRI.toLowerCase(), prices);
    const poolsInfo: IPoolInfo = await this.getAllPoolInfo();

    return {
      triUsdRatio,
      wnearUsdRatio,
      poolsInfo,
    };
  }

  private async getDataFromRewarder(multicallRsp) {
    const listRewarderForPool = Array.from(multicallRsp.entries()).filter(
      ([key, value]) => key.includes('rewarder') && value.output.data !== ZERO,
    );

    const calls = new Map(
      listRewarderForPool.flatMap(([, value]) => {
        return [
          [
            concatStrings(Abis.tokenPerBlock.name, value.lpAddress, value.output.data),
            {
              address: value.output.data,
              abi: Abis.tokenPerBlock,
              input: {
                data: [],
              },
              output: {},
            },
          ],
          [
            concatStrings(Abis.rewardToken.name, value.lpAddress, value.output.data),
            {
              address: value.output.data,
              abi: Abis.rewardToken,
              input: {
                data: [],
              },
              output: {},
            },
          ],
        ];
      }),
    );

    const dataRewarders = await this.multicallService.handleInBatches(calls, this.chain);

    const filteredOnlyRewarders = Array.from(dataRewarders.entries())
      .filter(([key]) => key.includes(Abis.rewardToken.name))
      .map(([, value]) => value.output.data);
    const tokens = new Map<string, ERC20TokenDto>(
      (
        await this.accountService.getAssets(
          [...filteredOnlyRewarders, TrisolarisAddresses.tri],
          [this.chain],
        )
      ).map((t) => [t.address, t]),
    );

    return { dataRewarders, tokens };
  }

  private getDexTokenUSDRatio(tokenAddress: string, prices?: any) {
    return prices[tokenAddress.toLowerCase()] ? 1 / prices[tokenAddress.toLowerCase()] : 0;
  }

  private calculateAPR({
    pool,
    multicallRsp,
    triUsdRatio,
    poolsInfo,
    tvl,
    dataRewarders,
    tokens,
    prices,
  }: ICalculateAprData) {
    const rewardTokens = [];

    const triiPerBlockV1 = multicallRsp
      .get(this.triPerBlockLabel(TrisolarisAddresses.MasterChefV1StakingContract))
      .output.data.toNumber();
    const triPerBlock = multicallRsp
      .get(this.triPerBlockLabel(pool.address))
      .output.data.toNumber();
    const allocPoint = multicallRsp
      .get(this.poolInfoLabel(pool.address, pool.poolId))
      .output.data[1].toNumber();
    const totalAllocPoint = multicallRsp
      .get(this.totalAllocPointLabel(TrisolarisAddresses.MasterChefV1StakingContract))
      .output.data.toNumber();
    const allocPointV2 = multicallRsp
      .get(this.poolInfoLabelV2(TrisolarisAddresses.MasterChefV2StakingContract, pool.poolId))
      .output.data[2].toNumber();
    const totalAllocPointV2 = multicallRsp
      .get(this.totalAllocPointLabel(TrisolarisAddresses.MasterChefV2StakingContract))
      .output.data.toNumber();
    const dummyLpAllocPoint = multicallRsp
      .get(this.poolInfoLabel(TrisolarisAddresses.MasterChefV1StakingContract, 7))
      .output.data[1].toNumber();

    const totalStakedInUSD = tvl;

    //Double reward if exists
    const rewarderAddress = multicallRsp.get(this.rewarderLabel(pool.address, pool.poolId)).output
      .data;
    if (rewarderAddress !== ZERO) {
      const rewardToken = dataRewarders.get(
        concatStrings(Abis.rewardToken.name, pool.stakingToken.address, rewarderAddress),
      ).output.data;

      const token = tokens.get(rewardToken.toLowerCase());
      const rewardPerBlock =
        dataRewarders.get(
          concatStrings(Abis.tokenPerBlock.name, pool.stakingToken.address, rewarderAddress),
        ).output.data /
        10 ** token.decimals;
      const doubleRewardUsdRatio = this.getDexTokenUSDRatio(rewardToken, prices);

      const totalYearlyRewards = rewardPerBlock * 3600 * 24 * 365;
      const AprDouble =
        totalStakedInUSD === 0 || doubleRewardUsdRatio === 0
          ? 0
          : (totalYearlyRewards * 100) / (totalStakedInUSD * doubleRewardUsdRatio);
      rewardTokens.push({
        apr: AprDouble,
        token: token.address,
      });
    }

    const foundPool = poolsInfo.get(pool.stakingToken.address);
    let Apr = 0;
    if (
      foundPool.poolAddress.toLowerCase() ===
      TrisolarisAddresses.MasterChefV1StakingContract.toLowerCase()
    ) {
      const totalSecondRewardRate = (triPerBlock * allocPoint) / (totalAllocPoint * 10 ** 18);
      const totalYearlyRewards = totalSecondRewardRate * 3600 * 24 * 365;
      Apr =
        totalStakedInUSD === 0 || triUsdRatio === 0
          ? 0
          : (totalYearlyRewards * 100) / (totalStakedInUSD * triUsdRatio);
    } else if (
      foundPool.poolAddress.toLowerCase() ===
      TrisolarisAddresses.MasterChefV2StakingContract.toLowerCase()
    ) {
      const dummyLpTotalSecondRewardRate =
        (triiPerBlockV1 * dummyLpAllocPoint) / (totalAllocPoint * 10 ** 18);
      const totalSecondRewardRate =
        (dummyLpTotalSecondRewardRate * allocPointV2) / totalAllocPointV2;
      const totalYearlyRewards = totalSecondRewardRate * 3600 * 24 * 365;
      Apr =
        totalStakedInUSD === 0 || triUsdRatio === 0
          ? 0
          : (totalYearlyRewards * 100) / (totalStakedInUSD * triUsdRatio);
    }
    if (rewardTokens.length === 0 || (rewardTokens[0]?.apr > 0 && Apr > 0)) {
      rewardTokens.push({
        apr: Apr,
        token: TrisolarisAddresses.tri,
      });
    }

    return rewardTokens;
  }

  private getCallsForPoolFromCalcAPR() {
    return new Map<string, CallData>([
      [
        concatStrings(Abis.getToken0.name, wNearUsdcPool),
        {
          address: wNearUsdcPool,
          abi: Abis.getToken0,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        concatStrings(Abis.getToken1.name, wNearUsdcPool),
        {
          address: wNearUsdcPool,
          abi: Abis.getToken1,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        concatStrings(Abis.getToken0.name, wNearTriPool),
        {
          address: wNearTriPool,
          abi: Abis.getToken0,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        concatStrings(Abis.getToken1.name, wNearTriPool),
        {
          address: wNearTriPool,
          abi: Abis.getToken1,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        concatStrings(Abis.getReserves.name, wNearTriPool),
        {
          address: wNearTriPool,
          abi: Abis.getReserves,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        concatStrings(Abis.getReserves.name, wNearUsdcPool),
        {
          address: wNearUsdcPool,
          abi: Abis.getReserves,
          input: {
            data: [],
          },
          output: {},
        },
      ],
    ]);
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

    // poolInfo to calculate APR
    calls.set(this.poolInfoLabel(stakingPosition.address, stakingPosition.poolId), {
      address: stakingPosition.address,
      abi: Abis[this.poolAddress2poolInfoAbi[stakingPosition.address]],
      input: {
        data: [stakingPosition.poolId],
      },
      output: {},
    });

    // contract address to double reward
    calls.set(this.rewarderLabel(stakingPosition.address, stakingPosition.poolId), {
      address: stakingPosition.address,
      id: stakingPosition.poolId,
      lpAddress: stakingPosition.stakingToken.address,
      abi: Abis.rewarder,
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
      [
        concatStrings(Abis.poolLength, TrisolarisAddresses.MasterChefV1StakingContract),
        {
          address: TrisolarisAddresses.MasterChefV1StakingContract,
          abi: Abis.poolLength,
          input: {
            data: [],
          },
          output: {},
        },
      ],
      [
        concatStrings(Abis.poolLength, TrisolarisAddresses.MasterChefV2StakingContract),
        {
          address: TrisolarisAddresses.MasterChefV2StakingContract,
          abi: Abis.poolLength,
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

  poolInfoLabelV2(address: string, poolId) {
    return concatStrings(Abis.poolInfoChefV2.name, address, poolId);
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

  private rewarderLabel(address: string, poolId: number) {
    return concatStrings(Abis.rewarder.name, address, poolId);
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
