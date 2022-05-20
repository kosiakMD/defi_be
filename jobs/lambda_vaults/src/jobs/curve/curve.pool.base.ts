import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainWrappedTokens,
  CurrencyIdEnum,
  FeatureEnum,
  Logger,
  PoolTokenDto,
  ProtocolNameEnum,
} from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CurveAddresses } from '@app/common/constant/curve.addresses';
import { CallData } from '@app/common/dto/CallData';
import { ERC20Token } from '@app/common/dto/ERC20Token';
import {
  CurveLiquidityPoolFeature,
  CurvePoolTokenDto,
  CurveUnderlyingLpDto,
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
import { CurveProviderAbi } from './abis/CurveProviderAbi';
import { CurveRegistryAbi } from './abis/CurveRegistryAbi';
import { ERC20Abi } from './abis/ERC20Abi';

@Injectable()
export class CurvePoolBase extends JobPoolsBase<CurveLiquidityPoolFeature> {
  chain;

  feature = FeatureEnum.pools;
  protocol = ProtocolNameEnum.curve;
  placeholder;

  protected registryV1Contract: string;
  protected registryV2Contract: string;
  protected metaPoolFactoryContract: string;
  protected registryPoolsMap: Map<string, string>;
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

  poolListLabel(poolId: number) {
    return concatStrings(CurveRegistryAbi.poolList.name, poolId);
  }

  getLpTokenLabel(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getLpToken.name, poolAddress);
  }

  getBalancesLabel(poolAddress: Address) {
    return concatStrings(CurveRegistryAbi.getBalances.name, poolAddress);
  }

  getTotalSupplyLabel(tokenAddress: Address) {
    return concatStrings(ERC20Abi.totalSupply.name, tokenAddress);
  }

  protected async rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    [this.registryV1Contract, this.registryV2Contract, this.metaPoolFactoryContract] =
      await this.getRegistryAddresses();

    const liquidityPools: CurveLiquidityPoolFeature[] = [];
    const settingId = this.settingLabel();

    const dbPoolLengthSetting = await this.findOrCreateSetting(settingId);
    const [registryV1PoolCount, registryV2PoolCount, metapoolCount] = await Promise.all([
      this.getPoolCount(this.registryV1Contract),
      this.getPoolCount(this.registryV2Contract),
      this.getPoolCount(this.metaPoolFactoryContract),
    ]);
    const poolIdTo = registryV1PoolCount + registryV2PoolCount + metapoolCount;

    const poolIdFrom = Number(dbPoolLengthSetting.value);

    if (poolIdFrom >= poolIdTo) {
      this.logger.log(
        `not necessary to update existed mapping, db poolLength ${poolIdFrom}, chain poolLength ${poolIdTo}`,
        this.placeholder,
      );
      await this.storeService.updateMapping(jobMapping);
      return jobMapping;
    }

    this.registryPoolsMap = new Map<string, string>();

    const [registryV1LpMap, registryV2LpMap, metaPoolLpMap] = await Promise.all([
      this.getRegistryPoolsLpTokens(this.registryV1Contract, registryV1PoolCount),
      this.getRegistryPoolsLpTokens(this.registryV2Contract, registryV2PoolCount),
      this.getRegistryPoolsLpTokens(this.metaPoolFactoryContract, metapoolCount),
    ]);

    const lpsAddresses = [
      ...registryV1LpMap.keys(),
      ...registryV2LpMap.keys(),
      ...metaPoolLpMap.keys(),
    ];
    const totalSupplyResp = await this.getLpTotalSuppliesMap(lpsAddresses);

    await Promise.all(
      lpsAddresses.map(async (token) => {
        let trackedLiquidityPoolTokenData = null;
        if (Number(totalSupplyResp.get(token)?.output.data) > 0) {
          trackedLiquidityPoolTokenData = await this.accountService.saveTrackingAsset(
            token,
            this.chain,
          );

          if (trackedLiquidityPoolTokenData.isLp) {
            this.logger.log(
              `found new lp token to track, address: [${trackedLiquidityPoolTokenData.address}], chain: [${this.chain}]`,
              this.placeholder,
            );

            const registry = this.registryPoolsMap.get(token);

            liquidityPools.push(
              this.toCurveLiquidityPoolFeature(
                trackedLiquidityPoolTokenData,
                registry,
                registryV1LpMap.get(token) ??
                  registryV2LpMap.get(token) ??
                  metaPoolLpMap.get(token),
              ),
            );
          }
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

  private async getLpTotalSuppliesMap(lps: string[]) {
    const totalSupplyCallsMap = lps.reduce((resp, address) => {
      const lpTokenContract = new CurveLpAbi(address);
      resp.set(address, lpTokenContract.totalSupply());
      return resp;
    }, new Map());

    return await this.multicallService.handleInBatches(totalSupplyCallsMap, this.chain);
  }

  private async getRegistryPoolsLpTokens(
    registryAddress: string,
    count: number,
  ): Promise<Map<string, string>> {
    if (registryAddress === ZERO_ADDRESS || count === 0) {
      return new Map<string, string>();
    }
    const registry = new CurveRegistryAbi(registryAddress);
    const poolListCalls = new Map<string, CallData>();
    for (let i = 0; i < count; i++) {
      poolListCalls.set(this.poolListLabel(i), registry.poolList(i));
    }
    const poolListResponse = await this.multicallService.handleInBatches(poolListCalls, this.chain);

    if (registryAddress === this.metaPoolFactoryContract) {
      const lpTokenCalls = new Map<string, string>();
      poolListResponse.forEach((poolList) => {
        lpTokenCalls.set(poolList.output.data.toLowerCase(), poolList.output.data.toLowerCase());
        this.registryPoolsMap.set(poolList.output.data.toLowerCase(), registryAddress);
      });
      return lpTokenCalls;
    }
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
      this.registryPoolsMap.set(value.output.data.toLowerCase(), registryAddress);
    });

    return poolLpTokensMap;
  }

  private toCurveLiquidityPoolFeature(
    lpTokenData: any, // TODO: IAssetToken | IAssetResponseDto,
    registry: string,
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
      registry: registry,
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

  private async getPoolCount(address: string): Promise<number> {
    if (address === ZERO_ADDRESS) {
      return 0;
    }
    const registry = new CurveRegistryAbi(address);
    const call = new Map<string, CallData>([[address, registry.poolCount()]]);
    const callRsp = await this.multicallService.handleInBatches(call, this.chain);
    return Number(callRsp.get(address).output.data.toString());
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
    } catch (e) {
      this.logger.error(e, 'toDbMapping');
    }
  }

  handleMainCoinAddress(token: CurveUnderlyingLpDto) {
    return token.address === ZERO_ADDRESS
      ? ChainWrappedTokens[token.symbol.toUpperCase()]
      : token.address;
  }

  async fillChainData(): Promise<CurveLiquidityPoolFeature[]> {
    [this.registryV1Contract, this.registryV2Contract, this.metaPoolFactoryContract] =
      await this.getRegistryAddresses();
    const calls = this.getCallsMap();

    const tokenAddresses = this.mapping.flatMap((curveLiquidityPoolFeature) => {
      return curveLiquidityPoolFeature.tokens.flatMap((token) => [
        this.handleMainCoinAddress(token),
        ...token.tokens.flatMap((t) => [
          this.handleMainCoinAddress(t),
          ...t.tokens.map((a) => this.handleMainCoinAddress(a)),
        ]),
      ]);
    });

    const [{ prices }, multicallResponses] = await Promise.all([
      this.priceService.getCurrentPrices(
        tokenAddresses,
        CurrencyIdEnum.usd,
        this.chain,
        this.protocol,
      ),
      this.multicallService.handleInBatches(calls, this.chain),
    ]);

    this.mapping = await Promise.all(
      this.mapping.map(async (curveLiquidityPoolFeature) => {
        try {
          const balances = multicallResponses.get(
            this.getBalancesLabel(curveLiquidityPoolFeature.lpToken.address),
          ).output.data;

          const lpTokenTotalSupply = multicallResponses
            .get(this.getTotalSupplyLabel(curveLiquidityPoolFeature.lpToken.address))
            ?.output.data.toString();

          curveLiquidityPoolFeature.lpToken.totalSupply = normalizeDecimals(
            lpTokenTotalSupply,
            curveLiquidityPoolFeature.lpToken.decimals,
          );

          const tokens = [];
          await Promise.all(
            curveLiquidityPoolFeature.tokens.map(async (coin) => {
              const coinTotalSupply = multicallResponses
                .get(this.getTotalSupplyLabel(coin.address))
                ?.output.data.toString();

              const reserve = normalizeDecimals(
                balances[coin.positionInPool].toString(),
                coin.decimals,
              );

              coin.totalSupply = normalizeDecimals(coinTotalSupply, coin.decimals);
              coin.reserve = coin.balance = reserve;
              coin.price = Number(prices[this.handleMainCoinAddress(coin)]);
              if (coin.tokens?.length) {
                let lpValue = 0;
                /* To obtain reserves in some cases need instead the balances method to call
                the getReserve method on the contract
                */
                const coinReserves =
                  multicallResponses.get(this.getBalancesLabel(coin.address))?.output.data ??
                  (await this.getLpReserves(coin.address));
                coin.tokens.forEach((poolToken) => {
                  const poolTokenPrice = Number(prices[this.handleMainCoinAddress(poolToken)]);
                  const coinReserveDec = normalizeDecimals(
                    coinReserves[poolToken.positionInPool],
                    poolToken.decimals,
                  );

                  poolToken.reserve = poolToken.balance = CurvePoolBase.getUnderlyingTokensReserves(
                    coin.reserve,
                    coin.totalSupply,
                    coinReserveDec,
                  );

                  poolToken.price = poolTokenPrice;
                  poolToken.value = poolToken.balance * poolTokenPrice;
                  lpValue += poolToken.value;
                  tokens.push(poolToken);
                  // TODO: temporarily to make logs clearer
                  // if (!poolToken.price) {
                  //   this.logger.warn(
                  //     `Missing Curve token price Chain: ${this.chain}, address: ${poolToken.address} - (${poolToken.symbol})`,
                  //   );
                  // }
                });
                curveLiquidityPoolFeature.stats.tvl += lpValue;
              } else {
                coin.value = coin.price * reserve;
                curveLiquidityPoolFeature.stats.tvl += coin.value;
                tokens.push(coin);
                // TODO: temporarily to make logs clearer
                // if (!coin.price) {
                //   this.logger.warn(
                //     `Missing Curve token price Chain: ${this.chain}, address: ${coin.address} - (${coin.symbol})`,
                //   );
                // }
              }
            }),
          );
          curveLiquidityPoolFeature.tokens = tokens;
          return curveLiquidityPoolFeature;
        } catch (e) {
          this.logger.error(e, 'fillChainData');
        }
      }),
    );

    return this.mapping;
  }

  private async getLpReserves(lpAddress: string) {
    try {
      const contract = new (this.web3Provider.getInstanceByChainId(this.chain).eth.Contract)(
        [CurveLpAbi.getReserves] as AbiItem[],
        lpAddress,
      );
      const resp = await contract.methods.getReserves().call();
      return Object.values(resp);
    } catch (e) {
      this.logger.warn(
        `Error during call getReserves method on the lp token ${lpAddress}, chain: ${this.chain}`,
      );
      return null;
    }
  }

  getCallsMap(): Map<string, CallData> {
    const calls = new Map<string, CallData>();
    this.mapping.forEach((poolFeature) => {
      const lpTokenContract = new CurveLpAbi(poolFeature.lpToken.address);
      const registry = new CurveRegistryAbi(poolFeature.registry);

      calls.set(
        this.getTotalSupplyLabel(poolFeature.lpToken.address),
        lpTokenContract.totalSupply(),
      );

      calls.set(
        this.getBalancesLabel(poolFeature.lpToken.address),
        poolFeature.registry === this.metaPoolFactoryContract
          ? registry.getMetaPoolBalances(poolFeature.address)
          : registry.getBalances(poolFeature.address),
      );

      poolFeature.tokens.forEach((coin) => {
        const tokenContract = new ERC20Abi(
          coin.address === ZERO_ADDRESS
            ? ChainWrappedTokens[coin.symbol.toUpperCase()]
            : coin.address,
        );
        calls.set(this.getTotalSupplyLabel(coin.address), tokenContract.totalSupply());
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
          registry: item.registry,
        } as CurveLiquidityPoolFeature);
    }
  }

  async getRegistryAddresses(): Promise<string[]> {
    const curveProvider = new CurveProviderAbi(CurveAddresses.addressProvider);
    const calls = [0, 5, 3].reduce((resp, value) => {
      resp.set(String(value), curveProvider.getIdInfo(value));
      return resp;
    }, new Map());

    const multResp = await this.multicallService.handleInBatches(calls, this.chain);
    return [0, 5, 3].map((value) => multResp.get(String(value)).output.data?.addr);
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
