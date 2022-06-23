import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum, ChainWrappedTokens } from '@app/common';
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
import { concatStrings } from '@app/common/utils';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Logger } from '../../logger/logger.service';
import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { CurveLpAbi } from './abis/CurveLpAbi';
import { CurveProvider } from './abis/CurveProvider';
import { CurveRegistryAbi } from './abis/CurveRegistryAbi';
import { ERC20Abi } from './abis/ERC20Abi';
import { additionalGaugeContractsMap } from './additional.gauge.contracts.map';
import { CurveGaugeInterface, CurveGaugesBase } from './curve.gauges.base';
import { LocalMultiCall } from './local.multicall';

@Injectable()
export class CurveGaugesAvax extends CurveGaugesBase {
  chain = ChainIdEnum.avax;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

  protected localMulticall;
  protected mapping = [];

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly storeService: StoreService,
    protected readonly multicallService: MulticallAggregator,
    protected readonly web3Provider: Web3ProviderService,
    protected readonly priceService: PriceService,
  ) {
    super(logger, accountService, storeService, multicallService, web3Provider, priceService);
    this.localMulticall = new LocalMultiCall(
      this.web3Provider.getInstanceByChainId(this.chain),
      this.logger,
    );
  }

  async getFactoryLpGaugeMap(factoryPoolCount: number, factoryAddress: string) {
    const registry = new CurveRegistryAbi(factoryAddress);
    const gaugeController = new CurveRegistryAbi(CurveAddresses.avaxGaugeController);
    const poolListCalls = new Map<string, CallData>();
    for (let i = 0; i < factoryPoolCount; i++) {
      poolListCalls.set(this.poolListLabel(i), registry.poolList(i));
    }
    const poolListResponse = await this.multicallService.handleInBatches(poolListCalls, this.chain);
    const gaugeCalls = new Map();
    const lpTokens = [];
    poolListResponse.forEach((value) => {
      const lpToken = value.output.data;
      lpTokens.push(lpToken);
      gaugeCalls.set(lpToken, gaugeController.getGaugeFromLp(lpToken));
    });

    const gaugeResponse = await this.multicallService.handleInBatches(gaugeCalls, this.chain);
    const lpFactoryGaugesMap = new Map();
    gaugeResponse.forEach((value, key) => {
      const gauge = value.output.data;
      if (gauge !== ZERO_ADDRESS) {
        // Object.assign(lpGauges, { [key.toLowerCase()]: value.output.data.toLowerCase() });
        const lpLowerCase = key.toLowerCase();
        lpFactoryGaugesMap.set(lpLowerCase, {
          gauge: value.output.data.toLowerCase(),
          registry: factoryAddress,
          lp: lpLowerCase,
          pool: lpLowerCase,
        });
      }
    });

    return lpFactoryGaugesMap;
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
    const gaugeController = new CurveRegistryAbi(CurveAddresses.avaxGaugeController);
    poolListResponse.forEach((poolList) => {
      const pool = poolList.output.data.toLowerCase();
      pools.push(pool);
      calls.set(this.getLpTokenLabel(pool), registry.getLpToken(pool));
      calls.set(this.getGaugeLabel(pool), registry.getGauges(pool));
      calls.set(this.getGaugeFromLpLabel(pool), gaugeController.getGaugeFromLp(pool));
    });

    const response = await this.multicallService.handleInBatches(calls, this.chain);
    const resultMap = new Map();
    pools.forEach((pool) => {
      const lp = response.get(this.getLpTokenLabel(pool)).output.data.toLowerCase();
      const gauge = `0x${response.get(this.getGaugeLabel(pool)).output.plain.slice(26, 66)}`;
      const controllerGauge = response.get(this.getGaugeFromLpLabel(pool))?.output.data;
      if (gauge !== ZERO_ADDRESS || controllerGauge !== ZERO_ADDRESS) {
        resultMap.set(lp, {
          pool,
          gauge: gauge || controllerGauge,
          registry: registryAddress,
          lp,
        });
      }
    });

    return resultMap;
  }

  async buildInitialMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);
    let registryFactoryContract;
    [this.registryV1Contract, registryFactoryContract, this.registryV2Contract] =
      await this.getRegistryAddresses();

    const stakingFeatures: CurveIntegrationStakingPositionDto[] = [];
    const [registryV1PoolCount, registryV2PoolCount, factoryPoolsCount] = await Promise.all([
      this.getPoolCount(this.registryV1Contract),
      this.getPoolCount(this.registryV2Contract),
      this.getPoolCount(registryFactoryContract),
    ]);

    const [registryV1PoolGaugeMap, registryV2PoolGaugeMap, factoryPoolGaugeMap] = await Promise.all(
      [
        this.getRegistryPoolsLpTokens(this.registryV1Contract, registryV1PoolCount),
        this.getRegistryPoolsLpTokens(this.registryV2Contract, registryV2PoolCount),
        this.getFactoryLpGaugeMap(factoryPoolsCount, registryFactoryContract),
      ],
    );

    const gaugesMap = new Map([
      ...registryV1PoolGaugeMap.entries(),
      ...registryV2PoolGaugeMap.entries(),
      ...factoryPoolGaugeMap.entries(),
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

  async getRegistryAddresses(): Promise<string[]> {
    const curveProvider = new CurveProvider(CurveAddresses.addressProvider);
    const calls = [0, 3, 5].reduce((resp, value) => {
      resp.set(String(value), curveProvider.getIdInfo(value));
      return resp;
    }, new Map());

    const multResp = await this.multicallService.handleInBatches(calls, this.chain);
    return [0, 3, 5].map((value) => multResp.get(String(value)).output.data?.addr);
  }

  getGaugeFromLpLabel(lpAddress: string) {
    return concatStrings(CurveRegistryAbi.getGaugeFromLp.name, lpAddress);
  }
}
