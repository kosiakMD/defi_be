import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainIdEnum,
  ChainNameEnum,
  CurrencyIdEnum,
  CurrentPricesPayload,
  FeatureEnum,
  ProtocolNameEnum,
} from '@app/common';
import { ETH_ADDRESS, WETH_ADDRESS, ZERO_ADDRESS } from '@app/common/constant';
import { CurveAddresses } from '@app/common/constant/curve.addresses';
import { CallData } from '@app/common/dto/CallData';
import {
  CurveIntegrationERC20TokenDto,
  CurveIntegrationStakingPositionDto,
  IntegrationClaimableTokenDto,
  IntegrationPoolTokenDto,
  UnderlyingStakingLp,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';
import { normalizeDecimals } from '@app/common/utils/number';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { toDecimals } from '../../utils/number';
import { isTimeToDo } from '../../utils/time';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { StakingFeatureMapping } from '../dto/mappings';
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { CurveControllerAbi } from './abis/CurveControllerAbi';
import { CurveLpAbi } from './abis/CurveLpAbi';
import { CurveRegistryAbi } from './abis/CurveRegistryAbi';
import { ERC20Abi } from './abis/ERC20Abi';
import { GaugeAbi } from './abis/GaugeAbi';
import { CurveApi } from './curve.api';
import {
  CrvAprs,
  FactoryAPYItem,
  FactoryV2PoolItem,
  PoolGaugeReward,
} from './curve.api.interfaces';
import { LocalMultiCall } from './local.multicall';

@Injectable()
export class CurveGauges implements JobInterface {
  chain = ChainIdEnum.eth;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.curve;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  private mapping = [];
  private availableDtosForConversion: Map<string, string>;
  private localMulticall;

  gaugeListLabel(poolId: number) {
    return concatStrings(CurveControllerAbi.gauges.name, CurveAddresses.controller, poolId);
  }

  handleCrvAprPoolsNames(poolName: string) {
    switch (poolName) {
      case 'y':
        return 'iearn';
      case 'susd':
        return 'susdv2';
      case 'aeth':
        return 'ankreth';
      default:
        return poolName;
    }
  }

  handleCurvePoolsNames(poolName: string) {
    switch (poolName) {
      case 'ren':
        return 'ren2';
      case 'sbtc':
        return 'rens';
      case 'aeth':
        return 'ankreth';
      default:
        return poolName;
    }
  }

  getGaugeLpBalancesLabel(address: Address, id: number) {
    return concatStrings(CurveLpAbi.balances.name, address, id);
  }

  getGaugeLpTokenLabel(gaugeAddress: Address) {
    return concatStrings(GaugeAbi.lpToken.name, gaugeAddress);
  }

  getTotalSupplyLabel(tokenAddress: Address) {
    return concatStrings(ERC20Abi.totalSupply.name, tokenAddress);
  }

  getPoolName(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getPoolName.name, poolAddress);
  }

  getGaugeLpPoolBalanceOf(lpAddress: Address) {
    return concatStrings(CurveLpAbi.balanceOf.name, lpAddress);
  }

  getGaugeTotalSupply(gauge: string) {
    return concatStrings(gauge, GaugeAbi.totalSupply.name);
  }

  getPoolFromLpLabel(lpAddress: Address) {
    return concatStrings(
      CurveRegistryAbi.getPoolFromLpToken.name,
      CurveAddresses.registry,
      lpAddress,
    );
  }

  getBalancesLabel(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getBalances.name, CurveAddresses.registry, poolAddress);
  }

  getUnderlyingBalancesLabel(poolAddress: Address) {
    return concatStrings(
      CurveRegistryAbi.getUnderlyingBalances.name,
      CurveAddresses.registry,
      poolAddress,
    );
  }

  getVirtualPriceFromLpTokenLabel(poolAddress: Address) {
    return concatStrings(
      CurveRegistryAbi.getVirtualPriceFromLpToken.name,
      CurveAddresses.registry,
      poolAddress,
    );
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly storeService: StoreService,
    private readonly multicallService: MulticallAggregator,
    private readonly web3Provider: Web3ProviderService,
    private readonly priceService: PriceService,
  ) {
    this.localMulticall = new LocalMultiCall(
      this.web3Provider.getInstanceByChainId(this.chain),
      this.logger,
    );
    this.availableDtosForConversion = new Map<string, string>([
      [CurveIntegrationStakingPositionDto.name, CurveIntegrationStakingPositionDto.name],
      [CurveIntegrationERC20TokenDto.name, ERC20Token.name],
      [UnderlyingStakingLp.name, UnderlyingStakingLp.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
      [UnderlyingStakingLp.name, UnderlyingStakingLp.name],
    ]);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;

    if (
      !jobMapping.mapping ||
      isTimeToDo(jobMapping.updatedAt ?? jobMapping.createdAt, jobMapping.updateFrequency)
    ) {
      jobMapping = await this.buildInitialMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures: CurveIntegrationStakingPositionDto[] = [];

    const [gaugeIdTo] = await Promise.all([this.getGaugeCount()]);
    const controller = new CurveControllerAbi(CurveAddresses.controller);

    const gaugesListCalls = new Map<string, CallData>();
    for (let i = 0; i < gaugeIdTo; i++) {
      gaugesListCalls.set(this.gaugeListLabel(i), controller.gauges(i));
    }

    const gaugesListResponse = await this.multicallService.handleInBatches(
      gaugesListCalls,
      this.chain,
    );

    const gaugeList = [...gaugesListResponse.values()];
    const getGaugeLpCalls = new Map<string, CallData>();
    gaugeList.forEach((resp) => {
      const item = resp.output.data.toLowerCase();
      if (!excludeGaugePools.some((address) => address === item)) {
        getGaugeLpCalls.set(this.getGaugeLpTokenLabel(item), {
          address: item,
          abi: GaugeAbi.lpToken,
          input: {
            data: [],
          },
          output: {},
        });
      }
    });

    const resp = await this.multicallService.handleInBatches(getGaugeLpCalls, this.chain);
    const gaugePools = [];
    [...Array(gaugeIdTo).keys()].forEach((index) => {
      const gauge = gaugeList[index].output.data.toLowerCase();
      const gaugeLp = resp.get(this.getGaugeLpTokenLabel(gauge));
      if (gaugeLp) {
        gaugePools.push({
          gauge: gaugeLp.address,
          lp: gaugeLp.output.data.toLowerCase(),
          gaugePoolId: index,
        });
      }
    });

    // TODO: can get the rewards information from the curve API
    const localMultiCall = new LocalMultiCall(
      this.web3Provider.getInstanceByChainId(this.chain),
      this.logger,
    );

    const gaugeRewardsMap = await localMultiCall.getGaugeRewardTokens(gaugePools);

    const dbRewardsTokens = await Promise.all(
      [[CurveAddresses.crvToken], ...gaugeRewardsMap.values()].flatMap((rewardTokens) => {
        return rewardTokens.map((token) =>
          this.accountService.saveTrackingAsset(token, this.chain),
        );
      }),
    );

    const rewardsTokensMap = new Map();
    dbRewardsTokens.forEach((token) => {
      rewardsTokensMap.set(
        token.address,
        plainToClass(IntegrationClaimableTokenDto, {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
        }),
      );
    });

    for (const value of gaugePools) {
      try {
        const poolTokenData: LiquidityPoolTokenDto = await this.accountService.saveTrackingAsset(
          value.lp,
          this.chain,
        );

        const stakingToken: CurveIntegrationERC20TokenDto = plainToClass(
          CurveIntegrationERC20TokenDto,
          {
            address: poolTokenData.address,
            name: poolTokenData.name,
            symbol: poolTokenData.symbol,
            decimals: poolTokenData.decimals,
          },
        );

        if (poolTokenData.underlyingAssets) {
          stakingToken.tokens = [];
          poolTokenData.underlyingAssets.forEach((pt) => {
            if (pt.underlyingAssets?.length) {
              const lp = plainToClass(UnderlyingStakingLp, {
                address: pt.address,
                name: pt.name,
                symbol: pt.symbol,
                decimals: pt.decimals,
                positionInPool: pt.positionInPool,
              });
              lp.tokens.push(
                ...pt.underlyingAssets.map((underlying) => {
                  return plainToClass(IntegrationPoolTokenDto, {
                    address: underlying.address,
                    name: underlying.name,
                    symbol: underlying.symbol,
                    decimals: underlying.decimals,
                    positionInPool: underlying.positionInPool,
                  });
                }),
              );
              stakingToken.tokens.push(lp);
            } else {
              stakingToken.tokens.push(
                plainToClass(IntegrationPoolTokenDto, {
                  address: pt.address,
                  name: pt.name,
                  symbol: pt.symbol,
                  decimals: pt.decimals,
                  positionInPool: pt.positionInPool,
                }),
              );
            }
          });
        }

        const rewards = gaugeRewardsMap.get(value.gauge) ?? [];
        const rewardsAddresses = [CurveAddresses.crvToken, ...rewards];
        const stakingPoolFeature: CurveIntegrationStakingPositionDto = plainToClass(
          CurveIntegrationStakingPositionDto,
          {
            address: value.gauge,
            poolId: value.gaugePoolId,
            poolName: null,
            rewards: rewardsAddresses.map((address) => rewardsTokensMap.get(address)),
            stakingToken: stakingToken,
          },
        );

        stakingFeatures.push(stakingPoolFeature);
      } catch (e) {
        this.logger.error(
          `error to get token data from account service, chain [${this.chain}], address [${value.lp}]`,
          this.placeholder,
        );
      }
    }

    const mappings = [];
    for (let i = 0; i < stakingFeatures.length; i++) {
      mappings.push(await this.toDbMapping(stakingFeatures[i]));
    }

    jobMapping.mapping = mappings;
    jobMapping.updatedAt = new Date();

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  private async toDbMapping(stakingPosition: CurveIntegrationStakingPositionDto) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});
    mappedDto.rewards = [];

    /** reward token */
    await Promise.all(
      stakingPosition.rewards.map(async (reward) => {
        const rewardTokenUniqueId = concatStrings(this.chain, reward.address);
        const rewardTokenItem: TrackedVaultItem = await this.getDbItem(reward, rewardTokenUniqueId);
        mappedDto.rewards.push({ dbId: rewardTokenItem.id, dtoName: reward.constructor.name });
      }),
    );

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
    if (stakingPosition.stakingToken.tokens?.length) {
      mappedDto.stakingToken.tokens = [];
      for (const t of stakingPosition.stakingToken.tokens) {
        const tokenId = concatStrings(this.chain, t.address);
        const tokenItem: TrackedVaultItem = await this.getDbItem(t, tokenId);

        if ((t as UnderlyingStakingLp).tokens) {
          const underlyingTokens = await Promise.all(
            (t as UnderlyingStakingLp).tokens.map(async (underlying) => {
              const underlyingId = concatStrings(this.chain, underlying.address);
              const underlyingItem: TrackedVaultItem = await this.getDbItem(
                underlying,
                underlyingId,
              );
              return {
                dbId: underlyingItem.id,
                dtoName: underlying.constructor.name,
                positionInPool: underlying.positionInPool,
              };
            }),
          );

          mappedDto.stakingToken.tokens.push({
            dbId: tokenItem.id,
            dtoName: t.constructor.name,
            positionInPool: t.positionInPool,
            tokens: underlyingTokens,
          });
        } else {
          mappedDto.stakingToken.tokens.push({
            dbId: tokenItem.id,
            dtoName: t.constructor.name,
            positionInPool: t.positionInPool,
          });
        }
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
    return temp ?? (await this.saveItemToDb(item, uniqueId));
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
        positionInPool: item.positionInPool,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    if (toUniversalDtoName === UnderlyingStakingLp.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        positionInPool: item.positionInPool,
        poolId: item.poolId,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }
    if (toUniversalDtoName === CurveIntegrationStakingPositionDto.name) {
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

  private async getPoolsMap(): Promise<[Map<string, string>, Map<string, string>]> {
    const nonRegisterPools = new Map();
    const registry = new CurveRegistryAbi(CurveAddresses.registry);
    // Get pool addresses
    const poolResponse = await this.multicallService.handleInBatches(
      new Map(
        this.mapping.map(({ stakingToken }) => [
          this.getPoolFromLpLabel(stakingToken.address),
          registry.getPoolFromLpToken(stakingToken.address),
        ]),
      ),
      this.chain,
    );

    const registerLpPools = new Map<string, string>();
    this.mapping.forEach(({ stakingToken }) => {
      const pool = poolResponse
        .get(this.getPoolFromLpLabel(stakingToken.address))
        .output.data?.toLowerCase();
      if (pool !== ZERO_ADDRESS) {
        registerLpPools.set(stakingToken.address, pool);
      } else {
        nonRegisterPools.set(stakingToken.address, stakingToken.address);
      }
    });
    // map each lptoken to its pool address
    return [registerLpPools, nonRegisterPools];
  }

  private nonRegisterLpPoolsHandling(
    stakingPosition: CurveIntegrationStakingPositionDto,
    // TODO: need to test
    //nonRegisterLpVirtualPrices: Map<string, string>,
    multicallResponses: Map<string, CallData>,
    prices: CurrentPricesPayload,
    factoryV2Pools: FactoryV2PoolItem[],
    factoryApys: FactoryAPYItem[],
  ) {
    try {
      stakingPosition.stats.poolApy = factoryApys.find(
        (factory) => factory.poolAddress.toLowerCase() === stakingPosition.stakingToken.address,
      )?.apy;
      const balance = multicallResponses
        .get(this.getGaugeLpPoolBalanceOf(stakingPosition.stakingToken.address))
        .output.data?.toString();
      const balanceDec = toDecimals(balance, stakingPosition.stakingToken.decimals);
      stakingPosition.stakingToken.balance = balanceDec;
      stakingPosition.staked = balanceDec;
      const totalSupplyWei = multicallResponses
        .get(this.getTotalSupplyLabel(stakingPosition.stakingToken.address))
        ?.output.data.toString();
      stakingPosition.stakingToken.totalSupply = normalizeDecimals(
        totalSupplyWei,
        stakingPosition.stakingToken.decimals,
      );
      const factoryItem = factoryV2Pools.find(
        (factory) => factory.address.toLowerCase() === stakingPosition.stakingToken.address,
      );
      stakingPosition.poolName = factoryItem?.name ?? null;
      stakingPosition.rewards.forEach((reward) => {
        reward.price = Number(prices[reward.address]);
        reward.apr =
          factoryItem?.gaugeRewards?.find(
            (gaugeReward) => gaugeReward.tokenAddress.toLowerCase() === reward.address,
          )?.apy ?? null;
      });
      stakingPosition.stakingToken.tokens.forEach((coin) => {
        const reserve = multicallResponses
          .get(
            this.getGaugeLpBalancesLabel(stakingPosition.stakingToken.address, coin.positionInPool),
          )
          ?.output.data.toString();
        const reserveDec = toDecimals(reserve, coin.decimals);
        const price = prices[coin.address];
        coin.price = Number(price);
        const coinTotalSupply = multicallResponses
          .get(this.getTotalSupplyLabel(coin.address))
          ?.output.data.toString();
        coin.totalSupply = normalizeDecimals(coinTotalSupply, coin.decimals);
        coin.reserve = reserve;
        coin.balance = reserveDec;
        if (coin.tokens?.length > 1) {
          let lpValue = 0;
          const underlyingReserves = multicallResponses.get(this.getBalancesLabel(coin.address))
            ?.output.data;

          coin.tokens?.forEach((underlyingToken) => {
            const nonRegisterReserve = multicallResponses
              .get(this.getGaugeLpBalancesLabel(coin.address, underlyingToken.positionInPool))
              ?.output.data.toString();
            const tokenReserveDec = toDecimals(
              nonRegisterReserve ?? underlyingReserves[underlyingToken.positionInPool]?.toString(),
              underlyingToken.decimals,
            );
            const underlyingReserve = CurveGauges.getUnderlyingTokensBalances(
              coin.balance,
              coin.totalSupply,
              tokenReserveDec,
            );

            underlyingToken.reserve = underlyingToken.balance = underlyingReserve;
            underlyingToken.price = Number(prices[underlyingToken.address.toLowerCase()]);
            underlyingToken.value = underlyingToken.reserve * underlyingToken.price;
            lpValue += underlyingToken.value;

            if (!underlyingToken.price) {
              this.logger.warn(
                `Missing Curve token price Chain: ${this.chain}, address: ${underlyingToken.address} - (${underlyingToken.symbol})`,
              );
            }
          });
          coin.value = lpValue;
        } else {
          coin.value = reserveDec * price;
          stakingPosition.stats.tvl += coin.value;
        }
      });
      return stakingPosition;
    } catch (e) {
      this.logger.error(e, 'nonRegisterLpPoolsHandling');
    }
  }

  private setCallsForNonRegistryToken(
    stakingPosition: CurveIntegrationStakingPositionDto,
    calls: Map<string, CallData>,
    nonRegisterMintersMap: Map<string, string>,
  ) {
    const stakingAddress = stakingPosition.stakingToken.address;
    const minter = nonRegisterMintersMap.get(stakingPosition.stakingToken.address);
    let lpContract = new CurveLpAbi(stakingAddress);
    calls.set(this.getTotalSupplyLabel(stakingAddress), lpContract.totalSupply());
    calls.set(
      this.getGaugeLpPoolBalanceOf(stakingAddress),
      lpContract.balanceOf(stakingPosition.address),
    );
    if (minter) {
      lpContract = new CurveLpAbi(minter);
    }
    stakingPosition.stakingToken.tokens?.forEach((coin) => {
      const contractAddress = coin.address === ZERO_ADDRESS ? WETH_ADDRESS : coin.address;
      const lpTokenContract = new ERC20Abi(contractAddress);
      calls.set(this.getTotalSupplyLabel(coin.address), lpTokenContract.totalSupply());
      calls.set(
        this.getGaugeLpBalancesLabel(stakingAddress, coin.positionInPool),
        lpContract.balances(coin.positionInPool),
      );
    });
  }

  async updateWithChainData(): Promise<any[]> {
    try {
      const curveApi = new CurveApi(this.logger);
      const [
        mainPoolsCrvAprs,
        registerAdditionalRewards,
        factoryV2Pools,
        factoryApys,
        poolsSubgraphData,
      ] = await Promise.all([
        curveApi.getCrvAprForMainPools(),
        curveApi.getAdditionalRewardTokensInfo(),
        curveApi.getFactoryV2Pools(),
        curveApi.getFactoryApysV2(),
        curveApi.getSubgraphPoolsData(ChainNameEnum[ChainIdEnum[this.chain]]),
      ]);
      const additionalRewardMap = new Map<string, PoolGaugeReward>();
      Object.entries(registerAdditionalRewards).forEach(([, value]) => {
        value.forEach((token) => {
          additionalRewardMap.set(token.tokenAddress?.toLowerCase(), token);
        });
      });

      const poolsSubgraphDataMap = poolsSubgraphData.reduce((resp, value) => {
        resp.set(value.address.toLowerCase(), {
          price: value.virtualPrice,
          apy: value.latestDailyApy,
        });
        return resp;
      }, new Map());

      const [registerLpPools, nonRegisterLps] = await this.getPoolsMap();
      const nonRegisterLpsArray = Array.from(nonRegisterLps.keys());
      const lpMintersMap = await this.localMulticall.getNonRegisterMinters(nonRegisterLpsArray);

      const calls = this.getCallsMap(registerLpPools, lpMintersMap);

      const tokenAddresses = [];
      this.mapping.forEach((stakingPosition) => {
        if (!stakingPosition.stakingToken.tokens.length) {
          tokenAddresses.push(stakingPosition.stakingToken.address);
        } else {
          stakingPosition.stakingToken.tokens?.forEach((token) => {
            tokenAddresses.push(token.address);
            token?.tokens?.forEach((t) => tokenAddresses.push(t.address));
          });
        }
        stakingPosition.rewards?.forEach((reward) => tokenAddresses.push(reward.address));
      });

      const [{ prices }, multicallResponses] = await Promise.all([
        this.priceService.getCurrentPrices(tokenAddresses, CurrencyIdEnum.usd, this.chain),
        this.multicallService.handleInBatches(calls, this.chain),
      ]);

      this.mapping = this.mapping.map((position) => {
        if (nonRegisterLps.get(position.stakingToken.address)) {
          return this.nonRegisterLpPoolsHandling(
            position,
            multicallResponses,
            prices,
            factoryV2Pools,
            factoryApys,
          );
        } else {
          return this.registerLpPoolsHandling(
            position,
            registerLpPools,
            multicallResponses,
            prices,
            additionalRewardMap,
            mainPoolsCrvAprs,
            poolsSubgraphDataMap,
          );
        }
      });

      return this.mapping;
    } catch (e) {
      this.logger.error(e, 'updateWithChainData');
    }
  }

  private async getGaugeCount(): Promise<number> {
    const controller = new CurveControllerAbi(CurveAddresses.controller);
    const call = new Map<string, CallData>([
      [CurveControllerAbi.nGauges.name, controller.nGauges()],
    ]);
    const callRsp = await this.multicallService.handleInBatches(call, this.chain);
    return Number(callRsp.get(CurveControllerAbi.nGauges.name).output.data.toString());
  }

  private getCallsMap(
    registerLpPools: Map<string, string>,
    nonRegisterMintersMap: Map<string, string>,
  ) {
    const registry = new CurveRegistryAbi(CurveAddresses.registry);
    const calls = new Map();

    this.mapping.forEach((staking) => {
      const poolAddress = registerLpPools.get(staking.stakingToken.address);
      if (!poolAddress) {
        this.setCallsForNonRegistryToken(staking, calls, nonRegisterMintersMap);
      } else {
        // Registry uses pool address for most calls
        const stakingTokenContract = new CurveLpAbi(staking.stakingToken.address);
        const gaugeContract = new GaugeAbi(staking.address);

        calls.set(this.getPoolName(poolAddress), registry.getPoolName(poolAddress));
        calls.set(
          this.getTotalSupplyLabel(staking.stakingToken.address),
          stakingTokenContract.totalSupply(),
        );

        calls.set(
          this.getBalancesLabel(staking.stakingToken.address),
          registry.getBalances(poolAddress),
        );

        calls.set(
          this.getUnderlyingBalancesLabel(staking.stakingToken.address),
          registry.getUnderlyingBalances(poolAddress),
        );

        calls.set(
          this.getVirtualPriceFromLpTokenLabel(staking.stakingToken.address),
          registry.getVirtualPriceFromLpToken(staking.stakingToken.address),
        );

        calls.set(
          this.getGaugeLpPoolBalanceOf(staking.stakingToken.address),
          stakingTokenContract.balanceOf(staking.address),
        );

        calls.set(this.getGaugeTotalSupply(staking.address), gaugeContract.totalSupply());

        staking.stakingToken.tokens?.forEach((coin) => {
          // If its an underlying LP, get the virtual prices for it too
          if (coin?.tokens?.length > 1) {
            calls.set(
              this.getVirtualPriceFromLpTokenLabel(coin.address),
              registry.getVirtualPriceFromLpToken(coin.address),
            );
          }

          const lpTokenContract = new ERC20Abi(
            coin.address === ETH_ADDRESS ? WETH_ADDRESS : coin.address,
          );
          calls.set(this.getTotalSupplyLabel(coin.address), lpTokenContract.totalSupply());
        });
      }
    });
    return calls;
  }

  private registerLpPoolsHandling(
    position: CurveIntegrationStakingPositionDto,
    registerLpPools: Map<string, string>,
    multicallResponses: Map<string, CallData>,
    prices: CurrentPricesPayload,
    additionalRewardMap: Map<string, PoolGaugeReward>,
    mainPoolsCrvAprs: CrvAprs,
    poolsSubgraphDataMap: Map<string, { price; apy }>,
  ) {
    const poolAddress = registerLpPools.get(position.stakingToken.address);
    const balances = multicallResponses.get(this.getBalancesLabel(position.stakingToken.address))
      .output.data;

    const poolSubgraphData = poolsSubgraphDataMap.get(poolAddress.toLowerCase());

    position.poolName = multicallResponses.get(this.getPoolName(poolAddress)).output.data;

    position.stakingToken.price = normalizeDecimals(
      poolSubgraphData?.price,
      position.stakingToken.decimals,
    );

    const staked =
      Number(
        multicallResponses.get(this.getGaugeLpPoolBalanceOf(position.stakingToken.address))?.output
          .data,
      ) || Number(multicallResponses.get(this.getGaugeTotalSupply(position.address))?.output.data);

    const lpTokenTotalSupply = multicallResponses
      .get(this.getTotalSupplyLabel(position.stakingToken.address))
      ?.output.data.toString();

    position.stakingToken.totalSupply = normalizeDecimals(
      lpTokenTotalSupply,
      position.stakingToken.decimals,
    );

    position.staked = toDecimals(staked, position.stakingToken.decimals);
    position.stakingToken.balance = position.staked;
    const crvApyItem = mainPoolsCrvAprs[this.handleCrvAprPoolsNames(position.poolName)];

    position.rewards = position.rewards
      ?.map((reward) => {
        reward.price = Number(prices[reward.address]);
        reward.apr =
          reward.address === CurveAddresses.crvToken
            ? crvApyItem?.crvApy
            : additionalRewardMap.get(reward.address)?.apy;
        return reward;
      })
      .filter((reward) => reward.apr !== undefined);

    position.stats.poolApy = poolSubgraphData?.apy;
    position.stakingToken.tokens?.forEach((coin) => {
      const coinVirtualPrice = multicallResponses.get(
        this.getVirtualPriceFromLpTokenLabel(coin.address),
      )?.output.data;

      const coinTotalSupply = multicallResponses
        .get(this.getTotalSupplyLabel(coin.address))
        ?.output.data.toString();

      const reserveDec = normalizeDecimals(balances[coin.positionInPool].toString(), coin.decimals);
      const price =
        (coinVirtualPrice && normalizeDecimals(coinVirtualPrice.toString(), coin.decimals)) ??
        Number(prices[coin.address]);

      // Reserve & Balance are the same in this context
      coin.totalSupply = normalizeDecimals(coinTotalSupply, coin.decimals);
      coin.reserve = balances[coin.positionInPool].toString();
      coin.balance = reserveDec;
      coin.price = price;

      // Update parent stats
      position.stats.tvl += coin.value;

      if (!price) {
        this.logger.warn(
          `Missing Curve token price Chain: ${this.chain}, address: ${coin.address} - (${coin.symbol})`,
        );
      }

      if (coin.tokens?.length > 1) {
        let lpValue = 0;
        coin.tokens?.forEach((underlyingToken) => {
          const balancesUnderlying = multicallResponses.get(this.getBalancesLabel(coin.address))
            ?.output.data;
          const coinReserve = balancesUnderlying[coin.positionInPool]?.toString();
          const coinReserveDec = toDecimals(coinReserve, underlyingToken.decimals);
          underlyingToken.reserve = underlyingToken.balance =
            CurveGauges.getUnderlyingTokensBalances(coin.balance, coin.totalSupply, coinReserveDec);
          underlyingToken.price = Number(prices[underlyingToken.address.toLowerCase()]);
          underlyingToken.value = underlyingToken.reserve * underlyingToken.price;
          lpValue += underlyingToken.value;

          if (!underlyingToken.price) {
            this.logger.warn(
              `Missing Curve token price Chain: ${this.chain}, address: ${underlyingToken.address} - (${underlyingToken.symbol})`,
            );
          }
        });
        coin.value = lpValue;
      } else {
        coin.value = reserveDec * price;
        position.stats.tvl += coin.value;
      }
    });
    return position;
  }

  private static getUnderlyingTokensBalances(
    lpTokenReserve: number,
    lpTokenTotalSupply: number,
    underlyingReserve: number,
  ) {
    return new BigNumber(lpTokenReserve) //
      .div(lpTokenTotalSupply)
      .times(underlyingReserve)
      .toNumber();
  }
}

export const excludeGaugePools = [
  '0xb9c05b8ee41fdcbd9956114b3af15834fdedcb54',
  '0xfe1a3dd8b169fb5bf0d5dbfe813d956f39ff6310',
  '0xc48f4653dd6a9509de44c92beb0604bea3aee714',
  '0x488e6ef919c2bb9de535c634a80afb0114da8f62',
  '0xfdb129ea4b6f557b07bcdcede54f665b7b6bc281',
  '0x060e386ecfbacf42aa72171af9efe17b3993fc4f',
  '0x6c09f6727113543fd061a721da512b7efcdd0267',
  '0xff17560d746f85674fe7629ce986e949602ef948',
  '0x9044e12fb1732f88ed0c93cfa5e9bb9bd2990ce5',
  '0x9f86c5142369b1ffd4223e5a2f2005fc66807894',
  '0x260e4fbb13dd91e187ae992c3435d0cf97172316',
  '0xb504b6eb06760019801a91b451d3f7bd9f027fc9',
  '0x75d05190f35567e79012c2f0a02330d3ed8a1f74',
  '0xa05e565ca0a103fcd999c7a7b8de7bd15d5f6505',
  '0xf2cde8c47c20acbffc598217ad5fe6db9e00b163',
  '0x56eda719d82ae45cbb87b7030d3fb485685bea45',
  '0xaf78381216a8ecc7ad5957f3cd12a431500e0b0d',
  '0x18478f737d40ed7defe5a9d6f1560d84e283b74e',
  '0x279f11f8e2825dbe0b00f6776376601ac948d868',
  '0x95069889df0bcdf15bc3182c1a4d6b20631f3b46',
  '0xc1c5b8aafe653592627b54b9527c7e98326e83ff',
  '0x9562c4d2e06aaf85efc5367fb4544eceb788465e',
  '0x9336da074c4f585a8b59a8c2b77a32b630cde5a1',
  '0xf2ddf89c04d702369ab9ef8399edb99a76e951ce',
  '0xfbb5b8f2f9b7a4d21ff44dc724c1fb7b531a6612',
  '0xc5ae4b5f86332e70f3205a8151ee9ed9f71e0797',
  '0x1c77fb5486545810679d53e325d5bcf6c6a45081',
  '0xd0698b2e41c42bce42b51f977f962fd127cf82ea',
  '0xbaf05d7aa4129ca14ec45cc9d4103a9ab9a9ff60',
  '0xa6ff75281eaca4cd5feeb333e8e15558208295e5',
  '0x18006c6a7955bf6db72de34089b975f733601660',
  '0x34ed182d0812d119c92907852d2b429f095a9b07',
  '0x1aeaa1b998307217d62e9eefb6407b10598ef3b8',
  '0xda690c2ea49a058a9966c69f46a05bfc225939f4',
  '0xdb3fd1bfc67b5d4325cb31c04e0cae52f1787fd6',
  '0x20759f567bb3ecdb55c817c9a1d13076ab215edc',
  '0x8d9649e50a0d1da8e939f800fb926cde8f18b47d',
  '0x6339ef8df0c2d3d3e7ee697e241666a916b81587',
  '0xce5f24b7a95e9cba7df4b54e911b4a3dc8cdaf6f',
  '0x15bb164f9827de760174d3d3dad6816ef50de13c',
  '0x00f7d467ef51e44f11f52a0c0bef2e56c271b264',
  '0x555766f3da968ecbefa690ffd49a2ac02f47aa5f',
  '0x1879075f1c055564cb968905ac404a5a01a1699a',
  '0xbb1b19495b8fe7c402427479b9ac14886cbbaaee',
  '0x8b397084699cc64e429f610f81fac13bf061ef55',
  '0x4620d46b4db7fb04a01a75ffed228bc027c9a899',
  '0xf7b9c402c4d6c2edba04a7a515b53d11b1e9b2cc',
  '0x319e268f0a4c85d404734ee7958857f5891506d7',
  '0xbc38bd19227f91424ed4132f630f51c9a42fa338',
  '0x82049b520cac8b05e703bb35d1691b5005a92848',
  '0xf4ea7617e7999710244e2eabfc8730d35482ee76',
  '0xd1426c391a7cbe9decd302ac9c44e65c3505d1f0',
  '0xb721cc32160ab0da2614cc6ab16ed822aeebc101',
  '0x94a5e05d66834c6c6961e199d34da576679fc187',
];
