import { plainToClass } from 'class-transformer';

import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainIdEnum,
  CurrencyIdEnum,
  FeatureEnum,
  Logger,
  PoolTokenDto,
  ProtocolNameEnum,
} from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { ERC20Token } from '@app/common/dto/ERC20Token';
import {
  CurveLiquidityPoolFeature,
  CurvePoolTokenDto,
  LiquidityPoolFeature,
} from '@app/common/jobs/pools';
import { concatStrings } from '@app/common/utils';
import { normalizeDecimals } from '@app/common/utils/number';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { FeatureMappingPoolToken, PoolsFeatureMapping } from '../dto/mappings';
import { JobBase } from '../job.base';
import { JobInterface } from '../job.interface';
import { CurveRegistryAbi } from './abis/CurveRegistryAbi';
import { ERC20Abi } from './abis/ERC20Abi';
import { CurveAddresses } from './addresses';

export class CurvePools extends JobBase<CurveLiquidityPoolFeature> implements JobInterface {
  chain = ChainIdEnum.eth;

  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.curve;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly settingsService: SettingsService,
    protected readonly storeService: StoreService,
    private readonly multicallService: MulticallAggregator,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
  ) {
    super();
    this.availableDtosForConversion = new Map<string, string>([
      [LiquidityPoolFeature.name, LiquidityPoolFeature.name],
      [CurveLiquidityPoolFeature.name, CurveLiquidityPoolFeature.name],
      [CurvePoolTokenDto.name, CurvePoolTokenDto.name],
      [ERC20Token.name, ERC20Token.name],
      [PoolTokenDto.name, ERC20Token.name],
    ]);
  }

  // labels
  settingLabel() {
    return concatStrings(this.placeholder, 'pool_count');
  }

  poolListLabel(poolId: number) {
    return concatStrings(CurveRegistryAbi.poolList.name, CurveAddresses.registry, poolId);
  }

  getLpTokenLabel(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getLpToken.name, CurveAddresses.registry, poolAddress);
  }

  getPoolLabel(tokenAddress: Address) {
    return concatStrings(
      CurveRegistryAbi.getPoolFromLpToken.name,
      CurveAddresses.registry,
      tokenAddress,
    );
  }

  getBalancesLabel(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getBalances.name, CurveAddresses.registry, poolAddress);
  }

  getDecimalsLabel(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getDecimals.name, CurveAddresses.registry, poolAddress);
  }
  getUnderlyingBalancesLabel(poolAddress: Address) {
    return concatStrings(
      CurveRegistryAbi.getUnderlyingBalances.name,
      CurveAddresses.registry,
      poolAddress,
    );
  }

  getUnderlyingDecimalsLabel(poolAddress: Address) {
    return concatStrings(
      CurveRegistryAbi.getUnderlyingDecimals.name,
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
  getTotalSupplyLabel(tokenAddress: Address) {
    return concatStrings(ERC20Abi.totalSupply.name, tokenAddress);
  }

  protected async rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const liquidityPools: CurveLiquidityPoolFeature[] = [];
    const settingId = this.settingLabel();

    const dbPoolLengthSetting = await this.findOrCreateSetting(settingId);

    const poolIdTo = (await this.getPoolCount()) - 1;

    const poolIdFrom = Number(dbPoolLengthSetting.value);

    if (poolIdFrom >= poolIdTo) {
      this.logger.log(
        `not necessary to update existed mapping, db poolLength ${poolIdFrom}, chain poolLength ${poolIdTo}`,
        this.placeholder,
      );
      return jobMapping;
    }

    const registry = new CurveRegistryAbi(CurveAddresses.registry);
    const poolListCalls = new Map<string, CallData>();
    for (let i = poolIdFrom; i <= poolIdTo; i++) {
      poolListCalls.set(this.poolListLabel(i), registry.poolList(i));
    }

    const poolListResponse = await this.multicallService.handleInBatches(poolListCalls, this.chain);

    const lpTokenCalls = new Map<string, CallData>();
    poolListResponse.forEach((poolList) => {
      lpTokenCalls.set(
        this.getLpTokenLabel(poolList.output.data),
        registry.getLpToken(poolList.output.data),
      );
    });

    const lpTokenResponse = await this.multicallService.handleInBatches(lpTokenCalls, this.chain);

    const lpTokens = [...lpTokenResponse.values()].map((r) => r.output.data.toLowerCase());

    await Promise.all(
      lpTokens.map(async (token) => {
        const trackedLiquidityPoolTokenData = await this.accountService.saveTrackingAsset(
          token,
          this.chain,
        );

        if (trackedLiquidityPoolTokenData.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${trackedLiquidityPoolTokenData.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPools.push(this.toCurveLiquidityPoolFeature(trackedLiquidityPoolTokenData));
        }

        return trackedLiquidityPoolTokenData;
      }),
    );

    // TODO: handle 0xeeeeeee (eth) pairs

    jobMapping.mapping = await Promise.all(liquidityPools.map((lp) => this.toDbMapping(lp)));

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    dbPoolLengthSetting.value = poolIdTo;
    await this.settingsService.update(dbPoolLengthSetting);

    return updatedMapping;
  }

  private toCurveLiquidityPoolFeature(
    lpTokenData: any, // TODO: IAssetToken | IAssetResponseDto,
  ): CurveLiquidityPoolFeature {
    const poolFeature = plainToClass(CurveLiquidityPoolFeature, {
      address: lpTokenData.address,
      name: lpTokenData.underlyingAssets
        ?.sort((a, b) => a.positionInPool - b.positionInPool)
        .map((pt) => pt.symbol)
        .join('/'),
      lpToken: plainToClass(ERC20Token, {
        address: lpTokenData.address.toLowerCase(),
        name: lpTokenData.name,
        symbol: lpTokenData.symbol,
        decimals: lpTokenData.decimals,
      }),
    });

    const tokens = [];

    lpTokenData.underlyingAssets?.forEach((pt) => {
      const token = plainToClass(CurvePoolTokenDto, {
        address: pt.address.toLowerCase(),
        name: pt.name,
        symbol: pt.symbol,
        decimals: pt.decimals,
        positionInPool: pt.positionInPool,
      });

      if (pt.underlyingAssets.length) {
        token.tokens = pt.underlyingAssets.map((underlying) => {
          return plainToClass(CurvePoolTokenDto, {
            address: underlying.address.toLowerCase(),
            name: underlying.name,
            symbol: underlying.symbol,
            decimals: underlying.decimals,
            positionInPool: underlying.positionInPool,
          });
        });
      }

      tokens.push(token);
    });
    poolFeature.tokens = tokens;
    return poolFeature;
  }

  private async getPoolCount(): Promise<number> {
    const registry = new CurveRegistryAbi(CurveAddresses.registry);
    const call = new Map<string, CallData>([[registry.abi.poolCount.name, registry.poolCount()]]);
    const callRsp = await this.multicallService.handleInBatches(call, this.chain);
    return Number(callRsp.get(registry.abi.poolCount.name).output.data.toString());
  }

  private async toDbMapping(liquidityPool: CurveLiquidityPoolFeature) {
    const mappedDto = plainToClass(PoolsFeatureMapping, {});
    /** lp token */
    const lpTokenUniqueId = concatStrings(this.chain, liquidityPool.lpToken.address);
    const lpTokenItem = await this.getDbItem(liquidityPool.lpToken, lpTokenUniqueId);
    mappedDto.lpToken = {
      dbId: lpTokenItem.id,
      dtoName: liquidityPool.lpToken.constructor.name,
    };

    /** pool tokens */
    mappedDto.tokens = [];
    for (const t of liquidityPool.tokens) {
      const tokenId = concatStrings(this.chain, t.address);
      const tokenItem: TrackedVaultItem = await this.getDbItem(t, tokenId);
      const mappedToken: FeatureMappingPoolToken = {
        dbId: tokenItem.id,
        dtoName: t.constructor.name,
        positionInPool: t.positionInPool,
        weight: t.weight,
        tokens: await Promise.all(
          t.tokens.map(async (token, idx) => {
            const tokenId = concatStrings(this.chain, token.address);
            const tokenItem: TrackedVaultItem = await this.getDbItem(token, tokenId);
            return {
              positionInPool: idx,
              dbId: tokenItem.id,
              dtoName: CurvePoolTokenDto.name,
            };
          }),
        ),
      };

      mappedDto.tokens.push(mappedToken);
    }

    /** pool feature */
    const positionUniqueId = concatStrings(this.chain, liquidityPool.address, 'lp');
    const position: TrackedVaultItem = await this.getDbItem(liquidityPool, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = liquidityPool.constructor.name;
    return mappedDto;
  }

  private async getPoolsMap() {
    const registry = new CurveRegistryAbi(CurveAddresses.registry);
    // get pool calls
    const poolCalls = new Map(
      this.mapping.map((lpToken) => [
        this.getPoolLabel(lpToken.address),
        registry.getPoolFromLpToken(lpToken.address),
      ]),
    );

    // Get pool addresses
    const poolResponse = await this.multicallService.handleInBatches(poolCalls, this.chain);

    // map each lptoken to its pool address
    return new Map(
      this.mapping.map((lpToken) => [
        lpToken.address,
        poolResponse.get(this.getPoolLabel(lpToken.address)).output.data.toLowerCase(),
      ]),
    );
  }

  private getFormattedDecimals(decimal, lpToken, coin) {
    if (lpToken.address === CurveAddresses.crvEurtUsd && coin.address === CurveAddresses.threeCrv) {
      return 18; // The smart contract is wrong for this pool and this token
    }

    return Number(decimal);
  }

  async updateWithChainData(): Promise<CurveLiquidityPoolFeature[]> {
    const poolsMap = await this.getPoolsMap();

    const registry = new CurveRegistryAbi(CurveAddresses.registry);

    const calls = new Map();
    // Get all balance Calls
    this.mapping.forEach((poolFeature) => {
      // Registry uses pool address for most calls
      const poolAddress = poolsMap.get(poolFeature.lpToken.address);
      const lpTokenContract = new ERC20Abi(poolFeature.lpToken.address);

      calls.set(
        this.getTotalSupplyLabel(poolFeature.lpToken.address),
        lpTokenContract.totalSupply(),
      );

      calls.set(
        this.getBalancesLabel(poolFeature.lpToken.address),
        registry.getBalances(poolAddress),
      );
      calls.set(
        this.getDecimalsLabel(poolFeature.lpToken.address),
        registry.getDecimals(poolAddress),
      );
      calls.set(
        this.getUnderlyingBalancesLabel(poolFeature.lpToken.address),
        registry.getUnderlyingBalances(poolAddress),
      );
      calls.set(
        this.getUnderlyingDecimalsLabel(poolFeature.lpToken.address),
        registry.getUnderlyingDecimals(poolAddress),
      );
      calls.set(
        this.getVirtualPriceFromLpTokenLabel(poolFeature.lpToken.address),
        registry.getVirtualPriceFromLpToken(poolFeature.lpToken.address),
      );

      poolFeature.tokens.forEach((coin) => {
        // If its an underlying LP, get the virtual prices for it too
        if (coin.tokens.length) {
          calls.set(
            this.getVirtualPriceFromLpTokenLabel(coin.address),
            registry.getVirtualPriceFromLpToken(coin.address),
          );
        }

        const lpTokenContract = new ERC20Abi(coin.address);
        calls.set(this.getTotalSupplyLabel(coin.address), lpTokenContract.totalSupply());
      });
    });

    const tokenAddresses = this.mapping.flatMap((curveLiquidityPoolFeature) => {
      return curveLiquidityPoolFeature.tokens.flatMap((token) => [
        token.address,
        ...token.tokens.flatMap((t) => [t.address, ...t.tokens.map((a) => a.address)]),
      ]);
    });

    const [{ prices }, multicallResponses] = await Promise.all([
      this.priceService.getCurrentPrices(tokenAddresses, CurrencyIdEnum.usd, this.chain),
      this.multicallService.handleInBatches(calls, this.chain),
    ]);

    this.mapping = this.mapping.map((curveLiquidityPoolFeature) => {
      const balances = multicallResponses.get(
        this.getBalancesLabel(curveLiquidityPoolFeature.address),
      ).output.data;
      const decimals = multicallResponses.get(
        this.getDecimalsLabel(curveLiquidityPoolFeature.address),
      ).output.data;

      const underlyingBalances = multicallResponses.get(
        this.getUnderlyingBalancesLabel(curveLiquidityPoolFeature.address),
      ).output.data;
      const underlyingDecimals = multicallResponses.get(
        this.getUnderlyingDecimalsLabel(curveLiquidityPoolFeature.address),
      ).output.data;

      const lpVirtualPrice = multicallResponses.get(
        this.getVirtualPriceFromLpTokenLabel(curveLiquidityPoolFeature.address),
      ).output.data;

      curveLiquidityPoolFeature.lpToken.price = normalizeDecimals(
        lpVirtualPrice,
        curveLiquidityPoolFeature.lpToken.decimals,
      );

      const lpTokenTotalSupply = multicallResponses
        .get(this.getTotalSupplyLabel(curveLiquidityPoolFeature.address))
        ?.output.data.toString();

      curveLiquidityPoolFeature.lpToken.totalSupply = normalizeDecimals(
        lpTokenTotalSupply,
        curveLiquidityPoolFeature.lpToken.decimals,
      );

      curveLiquidityPoolFeature.tokens.forEach((coin, idx) => {
        const coinVirtualPrice = multicallResponses.get(
          this.getVirtualPriceFromLpTokenLabel(coin.address),
        )?.output.data;

        const coinTotalSupply = multicallResponses
          .get(this.getTotalSupplyLabel(coin.address))
          ?.output.data.toString();

        const decimal = this.getFormattedDecimals(
          decimals[idx].toString(),
          curveLiquidityPoolFeature.lpToken,
          coin,
        );

        const reserve = normalizeDecimals(balances[idx].toString(), decimal);
        const price =
          (coinVirtualPrice && normalizeDecimals(coinVirtualPrice.toString(), decimal)) ??
          Number(prices[coin.address]);

        // Reserve & Balance are the same in this context
        coin.totalSupply = normalizeDecimals(coinTotalSupply, decimal);
        coin.reserve = coin.balance = reserve;
        coin.price = price;
        coin.value = reserve * price;

        // Update parent stats
        curveLiquidityPoolFeature.stats.tvl += coin.value;

        if (!price) {
          this.logger.warn(
            `Missing Curve token price Chain: ${this.chain}, address: ${coin.address} - (${coin.symbol})`,
          );
        }

        coin.tokens.forEach((underlyingToken, underlyingIdx) => {
          const underlyingDecimal = underlyingDecimals[underlyingIdx].toString();
          const underlyingReserve = normalizeDecimals(
            underlyingBalances[underlyingIdx].toString(),
            underlyingDecimal,
          );
          const underlyingPrice = prices[underlyingToken.address.toLowerCase()];
          underlyingToken.reserve = underlyingToken.balance = underlyingReserve;
          underlyingToken.price = underlyingPrice;
          underlyingToken.value = underlyingReserve * underlyingPrice;

          if (!underlyingPrice) {
            this.logger.warn(
              `Missing Curve token price Chain: ${this.chain}, address: ${underlyingToken.address} - (${underlyingToken.symbol})`,
            );
          }
        });
      });
      return curveLiquidityPoolFeature;
    });

    return this.mapping;
  }
}
