import BigNumber from 'bignumber.js';
import { classToPlain, plainToClass } from 'class-transformer';

import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainIdEnum,
  ChainWrappedTokens,
  CurrencyIdEnum,
  FeatureEnum,
  ProtocolNameEnum,
} from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
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
import { concatStrings, normalizeDecimals } from '@app/common/utils';
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
import { CurveLpAbi } from './abis/CurveLpAbi';
import { CurveProviderAbi } from './abis/CurveProviderAbi';
import { CurveRegistryAbi } from './abis/CurveRegistryAbi';
import { ERC20Abi } from './abis/ERC20Abi';
import { GaugeAbi } from './abis/GaugeAbi';
import { additionalGaugeContractsMap } from './additional.gauge.contracts.map';
import { CurveApi } from './curve.api';

export class CurveGaugesBase implements JobInterface {
  chain;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.curve;
  placeholder;

  protected registryV1Contract: string;
  protected registryV2Contract: string;

  protected mapping;
  private availableDtosForConversion: Map<string, string>;
  protected localMulticall;

  getTotalSupplyLabel(tokenAddress: Address) {
    return concatStrings(ERC20Abi.totalSupply.name, tokenAddress);
  }

  getPoolName(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getPoolName.name, poolAddress);
  }

  getPoolBalances(poolAddress: string, positionInPool: number) {
    return concatStrings(CurveLpAbi.balances.name, poolAddress, positionInPool);
  }

  getGaugeLpPoolBalanceOf(lpAddress: Address) {
    return concatStrings(CurveLpAbi.balanceOf.name, lpAddress);
  }

  getVirtualPrice(lpAddress: Address) {
    return concatStrings(CurveLpAbi.getVirtualPrice.name, lpAddress);
  }

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly web3Provider: Web3ProviderService,
    protected readonly priceService: PriceService,
  ) {
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
    [this.registryV1Contract, this.registryV2Contract] = await this.getRegistryAddresses();

    const stakingFeatures: CurveIntegrationStakingPositionDto[] = [];
    const [registryV1PoolCount, registryV2PoolCount] = await Promise.all([
      this.getPoolCount(this.registryV1Contract),
      this.getPoolCount(this.registryV2Contract),
    ]);

    const [registryV1PoolGaugeMap, registryV2PoolGaugeMap] = await Promise.all([
      this.getRegistryPoolsLpTokens(this.registryV1Contract, registryV1PoolCount),
      this.getRegistryPoolsLpTokens(this.registryV2Contract, registryV2PoolCount),
    ]);

    const gaugesMap = new Map([
      ...registryV1PoolGaugeMap.entries(),
      ...registryV2PoolGaugeMap.entries(),
      ...(additionalGaugeContractsMap.get(this.chain)?.entries() ?? []),
    ]);

    const gaugePoolsValues = Array.from(gaugesMap.values());

    const gaugeRewardsMap = await this.getNonEthRewards(
      gaugePoolsValues.map(({ gauge, lp }) => ({ gauge, lp })),
    );

    const dbRewardsTokens = await Promise.all(
      [...gaugeRewardsMap.values()].flatMap((rewardTokens) => {
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

    for (const value of gaugePoolsValues) {
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
        const rewardsAddresses = [...rewards];
        const stakingPoolFeature: CurveIntegrationStakingPositionDto = plainToClass(
          CurveIntegrationStakingPositionDto,
          {
            address: value.gauge,
            poolId: null,
            poolName: value.poolName ?? null,
            rewards: rewardsAddresses.map((address) => rewardsTokensMap.get(address)),
            stakingToken: stakingToken,
            pool: value.pool,
            registry: value.registry,
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

  async toDbMapping(stakingPosition: CurveIntegrationStakingPositionDto) {
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
        registry: item.registry,
        pool: item.pool,
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

  async getChainMainPoolsAprs() {
    const curveApi = new CurveApi(this.logger);
    switch (this.chain) {
      case ChainIdEnum.plg:
        return await curveApi.getMainPoolsAprPlg();
      case ChainIdEnum.avax:
        return await curveApi.getMainPoolsAprAvax();
      case ChainIdEnum.ftm:
        return await curveApi.getMainPoolsAprFtm();
      case ChainIdEnum.arbi:
        return await curveApi.getMainPoolsAprArbi();
      case ChainIdEnum.opt:
        return await curveApi.getMainPoolsAprOpt();
      case ChainIdEnum.harm:
        return await curveApi.getMainPoolsAprHarm();
      case ChainIdEnum.gnosis:
        return await curveApi.getMainPoolsAprGnosis();
    }
  }

  async updateWithChainData(): Promise<any[]> {
    try {
      const mainPoolsAprs = await this.getChainMainPoolsAprs();
      const lps = [];
      this.mapping.forEach((staking) => {
        lps.push(staking.stakingToken.address);
        staking.stakingToken.tokens.forEach((token) => {
          if (token.tokens?.length) {
            lps.push(token.address);
          }
        });
      });

      const lpTokensMinters = await this.localMulticall.getNonRegisterMinters(lps);

      const calls = this.getCallsMap(lpTokensMinters);

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
        const getTokenReserve = (address: Address, positionInPool: number) =>
          multicallResponses
            .get(this.getPoolBalances(lpTokensMinters.get(address) ?? address, positionInPool))
            ?.output.data.toString();

        const lpVirtualPrice = multicallResponses.get(
          this.getVirtualPrice(position.stakingToken.address),
        )?.output.data;

        position.stakingToken.price =
          normalizeDecimals(lpVirtualPrice, position.stakingToken.decimals) || null;

        const staked = multicallResponses
          .get(this.getGaugeLpPoolBalanceOf(position.stakingToken.address))
          ?.output.data.toString();

        const lpTokenTotalSupply = multicallResponses
          .get(this.getTotalSupplyLabel(position.stakingToken.address))
          ?.output.data.toString();

        position.stakingToken.totalSupply = normalizeDecimals(
          lpTokenTotalSupply,
          position.stakingToken.decimals,
        );

        position.staked = toDecimals(staked, position.stakingToken.decimals);
        position.stakingToken.balance = position.staked;

        position.rewards = position.rewards
          ?.map((reward) => {
            reward.price = Number(prices[reward.address]);
            reward.apr = null;
            return reward;
          })
          .filter((reward) => reward.apr !== undefined);

        position.stats.poolApy = mainPoolsAprs[position.poolName];
        position.stakingToken.tokens?.forEach((coin) => {
          const coinReserve = getTokenReserve(position.stakingToken.address, coin.positionInPool);
          const coinTotalSupply = multicallResponses
            .get(this.getTotalSupplyLabel(coin.address))
            ?.output.data.toString();
          const coinVirtualPrice = multicallResponses.get(this.getVirtualPrice(coin.address))
            ?.output.data;

          const reserveDec = normalizeDecimals(coinReserve, coin.decimals);
          const price =
            Number(prices[coin.address]) || normalizeDecimals(coinVirtualPrice, coin.decimals);

          // Reserve & Balance are the same in this context
          coin.totalSupply = normalizeDecimals(coinTotalSupply, coin.decimals);
          coin.reserve = coinReserve;
          coin.balance = reserveDec;
          coin.price = price;

          // Update parent stats
          position.stats.tvl += coin.value;

          if (!price) {
            this.logger.warn(
              `Missing Curve token price Chain: ${this.chain}, address: ${coin.address} - (${coin.symbol})`,
            );
          }

          if (coin.tokens?.length) {
            let lpValue = 0;
            coin.tokens?.forEach((underlyingToken) => {
              const coinReserve = getTokenReserve(coin.address, underlyingToken.positionInPool);
              const coinReserveDec = toDecimals(coinReserve, underlyingToken.decimals);
              underlyingToken.reserve = underlyingToken.balance = this.getUnderlyingTokensBalances(
                coin.balance,
                coin.totalSupply,
                coinReserveDec,
              );
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
        delete position.registry;
        delete position.pool;
        return position;
      });

      return this.mapping;
    } catch (e) {
      this.logger.error(e, 'updateWithChainData');
    }
  }

  getCallsMap(lpTokensMinters: Map<string, string>) {
    const calls = new Map();

    this.mapping.forEach((staking) => {
      // Registry uses pool address for most calls
      const stakingTokenContract = new CurveLpAbi(staking.stakingToken.address);
      const stakingPool =
        lpTokensMinters.get(staking.stakingToken.address) ?? staking.stakingToken.address;
      const curvePool = new CurveLpAbi(stakingPool);

      staking.stakingToken.tokens.forEach((token) => {
        calls.set(
          this.getPoolBalances(stakingPool, token.positionInPool),
          curvePool.balances(token.positionInPool),
        );
      });

      calls.set(
        this.getTotalSupplyLabel(staking.stakingToken.address),
        stakingTokenContract.totalSupply(),
      );

      calls.set(
        this.getGaugeLpPoolBalanceOf(staking.stakingToken.address),
        stakingTokenContract.balanceOf(staking.address),
      );

      calls.set(this.getVirtualPrice(staking.stakingToken.address), curvePool.getVirtualPrice());

      staking.stakingToken.tokens?.forEach((coin) => {
        if (coin.tokens?.length) {
          const underlyingStakingPool = lpTokensMinters.get(coin.address) ?? coin.address;
          const underlyingCurvePool = new CurveLpAbi(underlyingStakingPool);

          calls.set(this.getVirtualPrice(coin.address), underlyingCurvePool.getVirtualPrice());

          coin.tokens.forEach((token) => {
            calls.set(
              this.getPoolBalances(underlyingStakingPool, token.positionInPool),
              underlyingCurvePool.balances(token.positionInPool),
            );
          });
        }

        const lpTokenContract = new ERC20Abi(
          coin.address === ZERO_ADDRESS
            ? ChainWrappedTokens[coin.symbol.toUpperCase()]
            : coin.address,
        );
        calls.set(this.getTotalSupplyLabel(coin.address), lpTokenContract.totalSupply());
      });
    });
    return calls;
  }

  getUnderlyingTokensBalances(
    lpTokenReserve: number,
    lpTokenTotalSupply: number,
    underlyingReserve: number,
  ) {
    return new BigNumber(lpTokenReserve) //
      .div(lpTokenTotalSupply)
      .times(underlyingReserve)
      .toNumber();
  }

  async getPoolCount(address: string): Promise<number> {
    if (address === ZERO_ADDRESS) {
      return 0;
    }
    const registry = new CurveRegistryAbi(address);
    const call = new Map<string, CallData>([[address, registry.poolCount()]]);
    const callRsp = await this.multicallService.handleInBatches(call, this.chain);
    return Number(callRsp.get(address).output.data.toString());
  }

  async getRegistryPoolsLpTokens(
    registryAddress: string,
    count: number,
  ): Promise<Map<string, CurveGaugeInterface>> {
    if (registryAddress === ZERO_ADDRESS || count === 0) {
      return new Map<string, CurveGaugeInterface>();
    }
    const registry = new CurveRegistryAbi(registryAddress);
    const poolListCalls = new Map<string, CallData>();
    for (let i = 0; i < count; i++) {
      poolListCalls.set(this.poolListLabel(i), registry.poolList(i));
    }
    const poolListResponse = await this.multicallService.handleInBatches(poolListCalls, this.chain);

    const calls = new Map();
    const pools = [];
    poolListResponse.forEach((poolList) => {
      const pool = poolList.output.data.toLowerCase();
      pools.push(pool);
      calls.set(this.getLpTokenLabel(pool), registry.getLpToken(pool));
      calls.set(this.getGaugeLabel(pool), registry.getGauges(pool));
    });

    const response = await this.multicallService.handleInBatches(calls, this.chain);
    const resultMap = new Map();
    pools.forEach((pool) => {
      const lp = response.get(this.getLpTokenLabel(pool)).output.data.toLowerCase();
      const gauge = `0x${response.get(this.getGaugeLabel(pool)).output.plain.slice(26, 66)}`;
      if (gauge !== ZERO_ADDRESS) {
        resultMap.set(lp, {
          pool,
          gauge,
          registry: registryAddress,
          lp,
        });
      }
    });

    return resultMap;
  }

  async getNonEthRewards(gaugeData: { gauge: string; lp: string }[]) {
    const calls = new Map();
    gaugeData.forEach(({ gauge }) => {
      const gaugeContract = new GaugeAbi(gauge);
      [0, 1, 2].forEach((idx) => {
        calls.set(this.getRewardTokensLabel(gauge, idx), gaugeContract.rewardTokens(idx));
      });
    });

    const mulicallResp = await this.multicallService.handleInBatches(calls, this.chain);
    const resultMap = new Map();
    mulicallResp.forEach((value, key) => {
      const [gauge] = key.split('_');
      const address = value.output.data.toLowerCase();
      if (address !== ZERO_ADDRESS) {
        const mapItem = resultMap.get(gauge);
        mapItem ? mapItem.push(address) : resultMap.set(gauge, [address]);
      }
    });
    return resultMap;
  }

  poolListLabel(poolId: number) {
    return concatStrings(CurveRegistryAbi.poolList.name, poolId);
  }

  getGaugeLabel(poolAddress: string) {
    return concatStrings(CurveRegistryAbi.getGauge.name, poolAddress);
  }

  getLpTokenLabel(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getLpToken.name, poolAddress);
  }

  getRewardTokensLabel(gauge: string, index: number) {
    return concatStrings(gauge, index);
  }

  async getRegistryAddresses(): Promise<string[]> {
    const curveProvider = new CurveProviderAbi(CurveAddresses.addressProvider);
    const calls = [0, 5].reduce((resp, value) => {
      resp.set(String(value), curveProvider.getIdInfo(value));
      return resp;
    }, new Map());

    const multResp = await this.multicallService.handleInBatches(calls, this.chain);
    return [0, 5].map((value) => multResp.get(String(value)).output.data?.addr);
  }
}

export interface CurveGaugeInterface {
  pool: string;
  gauge: string;
  lp: string;
  poolName?: string;
  registry?: string;
}
