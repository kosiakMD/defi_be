import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
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
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { FeatureMappingPoolToken, PoolsFeatureMapping } from '../dto/mappings';
import { JobPoolsBase } from '../job.pools.base';
import { CurveLpAbi } from './abis/CurveLpAbi';
import { ERC20Abi } from './abis/ERC20Abi';
import { additionalGaugeContractsMap } from './additional.gauge.contracts.map';

@Injectable()
export class CurveNonregisterPoolsBase extends JobPoolsBase<CurveLiquidityPoolFeature> {
  chain;

  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.curve;
  placeholder;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly settingsService: SettingsService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly web3Provider: Web3ProviderService,
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

  getTotalSupplyLabel(tokenAddress: Address) {
    return concatStrings(ERC20Abi.totalSupply.name, tokenAddress);
  }

  getBalancesV2Label(poolAddress: Address, positionId: number) {
    return concatStrings(CurveLpAbi.balances.name, poolAddress, positionId);
  }

  protected async rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const liquidityPools: CurveLiquidityPoolFeature[] = [];
    const settingId = this.settingLabel();

    const dbPoolLengthSetting = await this.findOrCreateSetting(settingId);

    const additionalPools = additionalGaugeContractsMap.get(this.chain);
    const poolIdTo = additionalPools.size ?? 0;

    const poolIdFrom = Number(dbPoolLengthSetting.value);

    if (poolIdFrom >= poolIdTo) {
      this.logger.log(
        `not necessary to update existed mapping, db poolLength ${poolIdFrom}, chain poolLength ${poolIdTo}`,
        this.placeholder,
      );
      await this.storeService.updateMapping(jobMapping);
      return jobMapping;
    }

    await Promise.all(
      Array.from(additionalPools.keys()).map(async (token) => {
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
              additionalPools.get(token).pool,
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

  private async toDbMapping(liquidityPool: CurveLiquidityPoolFeature) {
    try {
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
    } catch (e: any) {
      this.logger.error(e, 'toDbMapping');
    }
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

    const resultMapping = [];
    this.mapping.forEach((curveLiquidityPoolFeature) => {
      try {
        const lpTokenTotalSupply = multicallResponses
          .get(this.getTotalSupplyLabel(curveLiquidityPoolFeature.lpToken.address))
          ?.output.data.toString();

        curveLiquidityPoolFeature.lpToken.totalSupply =
          normalizeDecimals(lpTokenTotalSupply, curveLiquidityPoolFeature.lpToken.decimals) || null;

        const tokens = [];
        curveLiquidityPoolFeature.tokens.map(async (coin) => {
          const coinTotalSupply = multicallResponses
            .get(this.getTotalSupplyLabel(coin.address))
            ?.output.data.toString();
          coin.totalSupply = normalizeDecimals(coinTotalSupply, coin.decimals);
          const reserve = multicallResponses.get(
            this.getBalancesV2Label(curveLiquidityPoolFeature.lpToken.address, coin.positionInPool),
          )?.output.data;

          coin.reserve = coin.balance = normalizeDecimals(reserve, coin.decimals);

          if (coin.tokens?.length) {
            let lpValue = 0;
            coin.tokens.forEach((poolToken) => {
              const poolTokenBalance = multicallResponses.get(
                this.getBalancesV2Label(coin.address, poolToken.positionInPool),
              )?.output.data;

              const poolTokenPrice = Number(prices[poolToken.address]);
              poolToken.reserve = poolToken.balance = this.getUnderlyingTokensBalances(
                coin.reserve,
                coin.totalSupply,
                normalizeDecimals(poolTokenBalance, poolToken.decimals),
              );

              poolToken.price = poolTokenPrice;
              poolToken.value = poolToken.balance * poolTokenPrice;
              lpValue += poolToken.value;
              tokens.push(poolToken);
              if (!poolToken.price) {
                this.logger.warn(
                  `Missing Curve token price Chain: ${this.chain}, address: ${poolToken.address} - (${poolToken.symbol})`,
                );
              }
            });
            curveLiquidityPoolFeature.stats.tvl += lpValue;
          } else {
            coin.price = Number(prices[coin.address]);
            coin.value = coin.price * coin.reserve;
            curveLiquidityPoolFeature.stats.tvl += coin.value;
            tokens.push(coin);
            if (!coin.price) {
              this.logger.warn(
                `Missing Curve token price Chain: ${this.chain}, address: ${coin.address} - (${coin.symbol})`,
              );
            }
          }
        });
        curveLiquidityPoolFeature.tokens = tokens;
        resultMapping.push(curveLiquidityPoolFeature);
      } catch (e: any) {
        this.logger.error(e, 'fillChainData');
      }
    });

    return resultMapping;
  }

  getCallsMap(): Map<string, CallData> {
    const calls = new Map<string, CallData>();
    this.mapping.forEach((poolFeature) => {
      const poolContract = new CurveLpAbi(poolFeature.address);
      const lpContract = new CurveLpAbi(poolFeature.lpToken.address);
      calls.set(this.getTotalSupplyLabel(poolFeature.lpToken.address), lpContract.totalSupply());
      poolFeature.tokens.forEach((token) => {
        calls.set(
          this.getBalancesV2Label(poolFeature.lpToken.address, token.positionInPool),
          poolContract.balances(token.positionInPool),
        );
        const tokenContract = new ERC20Abi(token.address);
        calls.set(this.getTotalSupplyLabel(token.address), tokenContract.totalSupply());
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
}
