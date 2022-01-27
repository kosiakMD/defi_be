import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
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
import { ETH_ADDRESS, WETH_ADDRESS } from '@app/common/constant';
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
import { IntegrationDataConverter } from '../integration.data.converter';
import { JobInterface } from '../job.interface';
import { JobPoolsBase } from '../job.pools.base';
import { CurveRegistryAbi } from './abis/CurveRegistryAbi';
import { ERC20Abi } from './abis/ERC20Abi';
import { CurveAddresses } from './addresses';

@Injectable()
export class CurvePools extends JobPoolsBase<CurveLiquidityPoolFeature> implements JobInterface {
  chain = ChainIdEnum.eth;

  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.curve;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected availableDtosForConversion: Map<string, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly settingsService: SettingsService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
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

  getTotalSupplyLabel(tokenAddress: Address) {
    return concatStrings(ERC20Abi.totalSupply.name, tokenAddress);
  }

  async manageMapping(): Promise<void> {
    let jobMapping = TrackedVaultsMap.get(this.placeholder) as TrackedVault;
    if (!jobMapping.mapping || jobMapping.mapping.length === 0) {
      this.logger.log('it is time to update mapping', this.placeholder);
      jobMapping = await this.rebuildMapping(jobMapping);
    }

    jobMapping.mapping.forEach((jm) => {
      this.mapping.push(IntegrationDataConverter.toDTO(jm));
    });
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
      await this.storeService.updateMapping(jobMapping);
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

    const poolLpTokensMap = new Map<string, string>();
    lpTokenResponse.forEach((value) => {
      poolLpTokensMap.set(value.output.data.toLowerCase(), value.input.data[0].toLowerCase());
    });

    await Promise.all(
      Array.from(poolLpTokensMap.keys()).map(async (token) => {
        const trackedLiquidityPoolTokenData = await this.accountService.saveTrackingAsset(
          token,
          this.chain,
        );

        if (trackedLiquidityPoolTokenData.isLp) {
          this.logger.log(
            `found new lp token to track, address: [${trackedLiquidityPoolTokenData.address}], chain: [${this.chain}]`,
            this.placeholder,
          );
          liquidityPools.push(
            this.toCurveLiquidityPoolFeature(
              trackedLiquidityPoolTokenData,
              poolLpTokensMap.get(token),
            ),
          );
        }

        return trackedLiquidityPoolTokenData;
      }),
    );

    jobMapping.mapping = await Promise.all(liquidityPools.map((lp) => this.toDbMapping(lp)));

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);

    dbPoolLengthSetting.value = poolIdTo;
    await this.settingsService.update(dbPoolLengthSetting);

    return updatedMapping;
  }

  private toCurveLiquidityPoolFeature(
    lpTokenData: any, // TODO: IAssetToken | IAssetResponseDto,
    poolAddress: string,
  ): CurveLiquidityPoolFeature {
    const poolFeature = plainToClass(CurveLiquidityPoolFeature, {
      address: poolAddress,
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

      if (pt.underlyingAssets?.length) {
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
    const call = new Map<string, CallData>([[registry.poolCount.name, registry.poolCount()]]);
    const callRsp = await this.multicallService.handleInBatches(call, this.chain);
    return Number(callRsp.get(registry.poolCount.name).output.data.toString());
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
          t.tokens.map(async (token) => {
            const tokenId = concatStrings(this.chain, token.address);
            const tokenItem: TrackedVaultItem = await this.getDbItem(token, tokenId);
            return {
              positionInPool: token.positionInPool,
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

  async fillChainData(): Promise<CurveLiquidityPoolFeature[]> {
    const calls = this.getCallsMap();

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
      try {
        const balances = multicallResponses.get(
          this.getBalancesLabel(curveLiquidityPoolFeature.lpToken.address),
        ).output.data;

        const lpVirtualPrice = multicallResponses.get(
          this.getVirtualPriceFromLpTokenLabel(curveLiquidityPoolFeature.lpToken.address),
        ).output.data;

        curveLiquidityPoolFeature.lpToken.price = normalizeDecimals(
          lpVirtualPrice,
          curveLiquidityPoolFeature.lpToken.decimals,
        );

        const lpTokenTotalSupply = multicallResponses
          .get(this.getTotalSupplyLabel(curveLiquidityPoolFeature.lpToken.address))
          ?.output.data.toString();

        curveLiquidityPoolFeature.lpToken.totalSupply = normalizeDecimals(
          lpTokenTotalSupply,
          curveLiquidityPoolFeature.lpToken.decimals,
        );

        const tokens = [];
        curveLiquidityPoolFeature.tokens.forEach((coin) => {
          const coinVirtualPrice = multicallResponses.get(
            this.getVirtualPriceFromLpTokenLabel(coin.address),
          )?.output.data;

          const coinTotalSupply = multicallResponses
            .get(this.getTotalSupplyLabel(coin.address))
            ?.output.data.toString();

          const reserve = normalizeDecimals(
            balances[coin.positionInPool].toString(),
            coin.decimals,
          );

          coin.totalSupply = normalizeDecimals(coinTotalSupply, coin.decimals);
          coin.reserve = coin.balance = reserve;
          const price =
            (coinVirtualPrice && normalizeDecimals(coinVirtualPrice.toString(), coin.decimals)) ??
            Number(prices[coin.address]);
          coin.price = price;
          if (coin.tokens?.length) {
            let lpValue = 0;
            coin.tokens.forEach((poolToken) => {
              const poolTokenPrice = Number(prices[poolToken.address]);
              const coinReserves = multicallResponses.get(this.getBalancesLabel(coin.address))
                .output.data;
              const coinReserveDec = normalizeDecimals(
                coinReserves[poolToken.positionInPool],
                poolToken.decimals,
              );

              poolToken.reserve = poolToken.balance = CurvePools.getUnderlyingTokensReserves(
                coin.reserve,
                coin.totalSupply,
                coinReserveDec,
              );

              poolToken.price = poolTokenPrice;
              poolToken.value = poolToken.balance * poolTokenPrice;
              lpValue += poolToken.value;
              tokens.push(poolToken);
            });
            curveLiquidityPoolFeature.stats.tvl += lpValue;
          } else {
            coin.value = price * reserve;
            curveLiquidityPoolFeature.stats.tvl += coin.value;
            tokens.push(coin);
          }

          if (!price) {
            this.logger.warn(
              `Missing Curve token price Chain: ${this.chain}, address: ${coin.address} - (${coin.symbol})`,
            );
          }
        });
        curveLiquidityPoolFeature.tokens = tokens;
        return curveLiquidityPoolFeature;
      } catch (e) {
        this.logger.error(e, 'fillChainData');
      }
    });

    return this.mapping;
  }

  private getCallsMap(): Map<string, CallData> {
    const calls = new Map<string, CallData>();
    const registry = new CurveRegistryAbi(CurveAddresses.registry);
    this.mapping.forEach((poolFeature) => {
      const lpTokenContract = new ERC20Abi(poolFeature.lpToken.address);

      calls.set(
        this.getTotalSupplyLabel(poolFeature.lpToken.address),
        lpTokenContract.totalSupply(),
      );

      calls.set(
        this.getBalancesLabel(poolFeature.lpToken.address),
        registry.getBalances(poolFeature.address),
      );
      calls.set(
        this.getUnderlyingBalancesLabel(poolFeature.lpToken.address),
        registry.getUnderlyingBalances(poolFeature.address),
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
        const lpTokenContract = new ERC20Abi(
          coin.address === ETH_ADDRESS ? WETH_ADDRESS : coin.address,
        );
        calls.set(this.getTotalSupplyLabel(coin.address), lpTokenContract.totalSupply());
      });
    });
    return calls;
  }

  getItemAsDto(item) {
    const toUniversalDtoName = this.availableDtosForConversion.get(item.constructor.name);
    switch (toUniversalDtoName) {
      case CurvePoolTokenDto.name:
        return plainToClass(CurvePoolTokenDto, {
          address: item.address,
          name: item.name,
          symbol: item.symbol,
          decimals: item.decimals,
          isLp: item.isLp,
          lp: item.lpAddress,
          positionInPool: null,
          totalSupply: null,
          weight: null,
          reserve: null,
          value: null,
          balance: null,
          price: null,
          tokens: item.tokens,
        } as CurvePoolTokenDto);

      case ERC20Token.name:
        return plainToClass(ERC20Token, {
          address: item.address,
          name: item.name,
          symbol: item.symbol,
          decimals: item.decimals,
        } as ERC20Token);

      case LiquidityPoolFeature.name:
        return plainToClass(LiquidityPoolFeature, {
          address: item.address,
          name: item.name,
        } as LiquidityPoolFeature);

      case CurveLiquidityPoolFeature.name:
        return plainToClass(CurveLiquidityPoolFeature, {
          address: item.address,
          name: item.name,
        } as CurveLiquidityPoolFeature);
    }
  }

  private static getUnderlyingTokensReserves(
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
