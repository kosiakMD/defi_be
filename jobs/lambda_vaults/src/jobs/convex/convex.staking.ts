import { ClassConstructor, plainToClass } from 'class-transformer';

import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, FeatureEnum, Logger, ProtocolNameEnum } from '@app/common';
import { WETH_ADDRESS, ZERO_ADDRESS } from '@app/common/constant';
import {
  CONVEX_BOOSTER,
  CRVCVX_REWARD_POOL_ADDRESS,
  CRV_ADDRESS,
  CRYPTO_SWAP_REGISTRY,
  CURVE_REGISTRY,
  CVX_ADDRESS,
  CVX_CRV_ADDRESS,
  CVX_REWARD_POOL_ADDRESS,
  FACTORY_REGISTRY,
} from '@app/common/constant/protocols/convex.constants';
import { CallData } from '@app/common/dto/CallData';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
  UnderlyingStakingLp,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings, normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { ConvexBooster } from '@app/common/web3provider/contracts/protocols/convex/ConvexBooster';
import { CryptoSwapRegistry } from '@app/common/web3provider/contracts/protocols/convex/CryptoSwapRegistry';
import { CvxRewardPool } from '@app/common/web3provider/contracts/protocols/convex/CvxRewardPool';
import { VirtualBalanceRewardPool } from '@app/common/web3provider/contracts/protocols/convex/VirtualBalanceRewardPool';
import { CurveFactory } from '@app/common/web3provider/contracts/protocols/curve/CurveFactory';
import { CurveRegistry } from '@app/common/web3provider/contracts/protocols/curve/CurveRegistry';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../microservices/account.service';
import { LiquidityPoolTokenDto } from '../../microservices/dto/account/account.dto';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import {
  FeatureMappingDbItem,
  FeatureMappingStakingPoolToken,
  FeatureMappingStakingToken,
  StakingFeatureMapping,
} from '../dto/mappings';
import { JobInterface } from '../job.interface';
import { JobStakingBase } from '../job.staking.base';
import { ConvexPoolInfo } from './convex.interfaces';

export class ConvexStaking
  extends JobStakingBase<IntegrationStakingPositionDto>
  implements JobInterface
{
  chain = ChainIdEnum.eth;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.Convex;
  placeholder = concatStrings(this.chain, this.protocol, this.feature);

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
      [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
      [IntegrationERC20TokenDto.name, ERC20Token.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
    ]);
  }

  totalSupplyLabel(underlying: ERC20Token) {
    return `${underlying.address}-totalSupply`;
  }

  lpBalanceLabel(token: ERC20Token, underlying: ERC20Token) {
    return `${token.address}-${underlying.address}-reserves`;
  }

  getPoolFromLpLabel(registry: Address, lpAddress: Address) {
    return concatStrings('pool', registry, lpAddress);
  }
  /**
   *  Updates the tracked vault with the latest staking features
   *
   * @param trackedVault Database TrackedVault
   * @returns updated tracked vault
   */
  async rebuildMapping(trackedVault: TrackedVault): Promise<TrackedVault> {
    this.logger.log('building initial mapping', this.placeholder);

    const stakingFeatures = await this.buildStakingFeatures();

    return this.updateTrackedVaultWithStakingFeatures(trackedVault, stakingFeatures);
  }

  async fillChainData(
    stakingFeatures: IntegrationStakingPositionDto[],
  ): Promise<IntegrationStakingPositionDto[]> {
    // get all involved addresses
    const addresses = this.getTokenAddresses(stakingFeatures);
    const prices = await this.fetchPrices(addresses);
    const totalSupplies = await this.fetchTotalSupplies(addresses);

    const [balances, calculatePriceFromTotalSupply] = await this.getUnderlyingBalances(
      stakingFeatures.filter(
        (t) => ![CVX_REWARD_POOL_ADDRESS, CRVCVX_REWARD_POOL_ADDRESS].includes(t.address),
      ),
    );

    // Get balances & reserves
    stakingFeatures.forEach((stakingFeature) => {
      stakingFeature.staked = balances.get(`${stakingFeature.address}-staked`);

      stakingFeature.stakingToken.totalSupply = normalizeDecimals(
        totalSupplies.get(stakingFeature.stakingToken.address),
        stakingFeature.stakingToken.decimals,
      );

      stakingFeature.stakingToken.tokens.forEach((token) => {
        const tokenReserve = normalizeDecimals(
          balances.get(stakingFeature.stakingToken.address).get(token.address),
          token.decimals,
        );
        token.reserve = tokenReserve;
        token.totalSupply = normalizeDecimals(totalSupplies.get(token.address), token.decimals);

        token.tokens.forEach((underlying) => {
          const underlyingReserve = normalizeDecimals(
            // Attempt Getting the most specific first
            balances.get(stakingFeature.stakingToken.address).get(underlying.address) ??
              balances.get(token.address).get(underlying.address),
            underlying.decimals,
          );
          underlying.reserve = underlyingReserve;
          underlying.totalSupply = normalizeDecimals(
            totalSupplies.get(underlying.address),
            underlying.decimals,
          );
        });
      });

      stakingFeature.rewards.forEach((reward) => {
        reward.totalSupply = normalizeDecimals(totalSupplies.get(reward.address), reward.decimals);
      });
    });

    // get prices (sometimes based on underlying balances)
    const calculatedPrices = new Map(); // fallback calculated prices from other pools
    stakingFeatures.forEach((stakingFeature) => {
      stakingFeature.stakingToken.value = 0;
      stakingFeature.rewards.forEach((reward) => {
        reward.price = this.calculatePriceFromUnderlying(
          reward,
          prices,
          calculatedPrices,
          reward.totalSupply,
        );
      });

      stakingFeature.stakingToken.tokens.forEach((token) => {
        token.tokens.forEach((underlying) => {
          underlying.price = this.calculatePriceFromUnderlying(
            underlying,
            prices,
            calculatedPrices,
            underlying.reserve,
          );
          underlying.value = underlying.price * underlying.reserve;
        });

        token.price = this.calculatePriceFromUnderlying(
          token,
          prices,
          calculatedPrices,
          calculatePriceFromTotalSupply.has(stakingFeature.stakingToken.address)
            ? token.totalSupply
            : token.reserve,
        );
        token.value = token.price * token.reserve;
        stakingFeature.stakingToken.value += token.value;
      });

      // Calculate the price based on the underlying reserve values
      stakingFeature.stakingToken.price =
        stakingFeature.stakingToken.value / stakingFeature.stakingToken.totalSupply;
    });

    return stakingFeatures;
  }

  calculatePriceFromUnderlying(
    token,
    prices: Map<Address, string | number>,
    calculatedPrices: Map<Address, number>,
    countableReserves: number,
  ) {
    if (prices.get(token.address)) {
      return Number(prices.get(token.address));
    }

    if (calculatedPrices.get(token.address)) {
      return calculatedPrices.get(token.address);
    }

    if (token.tokens?.length && token.tokens.every((token) => token.value)) {
      const totalValue = token.tokens.reduce((total, underlying) => total + underlying.value, 0);

      const price = totalValue / countableReserves;
      if (price) {
        calculatedPrices.set(token.address, price);
      }

      return price;
    }

    return null;
  }

  async fetchTotalSupplies(addresses: Address[]): Promise<Map<Address, string>> {
    const calls = new Map();
    addresses.forEach((address) => {
      if (address !== ZERO_ADDRESS) {
        calls.set(address, new ERC20(address).totalSupply());
      } else {
        calls.set(address, new ERC20(WETH_ADDRESS).totalSupply());
      }
    });

    const results = await this.multicallService.handleInBatches(calls, this.chain);
    const data = new Map();
    results.forEach((result, key) => {
      data.set(key, result.output.data.toString());
    });
    return data;
  }

  getStakingTokenData(
    stakingFeature: IntegrationStakingPositionDto,
    prices: Map<string, number>,
    onChainData: Map<string, CallData>,
  ) {
    const { address, decimals } = stakingFeature.stakingToken;

    const rawTotalSupply = onChainData.get(`${address}-totalSupply`).output.data.toString();

    // Staking Token Data
    const price = prices.get(address);
    const value = price * normalizeDecimals(stakingFeature.staked, decimals);
    const totalSupply = normalizeDecimals(rawTotalSupply, decimals);

    return {
      price,
      value,
      totalSupply,
    };
  }

  getTokenAddresses(stakingFeatures: IntegrationStakingPositionDto[]): Address[] {
    return Array.from(
      new Set(
        stakingFeatures.flatMap((stakingFeature) => [
          // Staking Tokens
          stakingFeature.stakingToken.address,
          ...stakingFeature.stakingToken.tokens.flatMap((t): string[] => [
            // Underlying tokens
            t.address,
            // And underlying-underlying tokens
            ...t.tokens.map((tt): string => tt.address),
          ]),
          // Rewards
          ...stakingFeature.rewards.map((r) => r.address),
        ]),
      ),
    );
  }

  /******************************************
   * Below Here is 'rebuildMapping' helpers *
   ******************************************/

  /**
   * Gets the static data used for the vault mapping
   * All staking pools & associated tokens.
   *
   * @returns Promise<IntegrationStakingPositionDto[]>
   */
  private async buildStakingFeatures(): Promise<IntegrationStakingPositionDto[]> {
    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    stakingFeatures.push(await this.getCVXStaking());
    stakingFeatures.push(await this.getCVXCRVStaking());
    stakingFeatures.push(...(await this.getCurveLPStaking()));

    return stakingFeatures;
  }

  private async getCurveLPStaking(): Promise<IntegrationStakingPositionDto[]> {
    // get pool list
    const rawPools = await this.getBoosterPoolInfo();

    // Get reward lengths of all pools
    const rewardPoolLengthCalls = new Map(
      rawPools.map((poolInfo): [Address, CallData] => {
        const rewardPool = new CvxRewardPool(poolInfo.crvRewards);
        return [poolInfo.crvRewards, rewardPool.extraRewardsLength()];
      }),
    );

    // Make RPC call once to get the number of extra rewards per contract
    const rewardPoolLengths = await this.multicallService.handleInBatches(
      rewardPoolLengthCalls,
      this.chain,
    );

    const extraRewardAddressCalls = new Map(
      rawPools.flatMap((poolInfo) => {
        const rewardPool = new CvxRewardPool(poolInfo.crvRewards);

        const extraRewardPoolLength = rewardPoolLengths
          .get(poolInfo.crvRewards)
          .output.data.toString();
        return Array.from(Array(parseInt(extraRewardPoolLength, 10)).keys()).map((pool: number) => {
          return [`${poolInfo.crvRewards}-${pool}`, rewardPool.extraRewards(pool)];
        });
      }),
    );

    // Make RPC call once to get all the reward contract calls
    const virtualRewardAddress = await this.multicallService.handleInBatches(
      extraRewardAddressCalls,
      this.chain,
    );

    const rewardTokenCalls = new Map(
      Array.from(virtualRewardAddress.values()).map((reward) => {
        const rewardAddress = reward.output.data.toString().toLowerCase();
        const contract = new VirtualBalanceRewardPool(rewardAddress);
        return [rewardAddress, contract.rewardToken()];
      }),
    );

    // Make RPC call once to get all the reward token addresses
    const rewardTokens = await this.multicallService.handleInBatches(rewardTokenCalls, this.chain);

    const allTokenAddresses = Array.from(rewardTokens.values()).reduce((acc, cur) => {
      return acc.add(cur.output.data.toString().toLowerCase());
    }, new Set([CVX_CRV_ADDRESS, CRV_ADDRESS]));

    rawPools.forEach((poolInfo) => allTokenAddresses.add(poolInfo.lptoken.toLowerCase()));

    // Save involved assets & get filled asset data
    const rawTokens = await this.saveAssets(Array.from(allTokenAddresses));

    const [stakingTokenMap, rewardTokenMap] = await this.formatTokens(
      rawPools,
      rawTokens,
      rewardTokens,
      virtualRewardAddress,
      rewardPoolLengths,
    );

    return rawPools.map((poolInfo) => {
      return plainToClass(IntegrationStakingPositionDto, {
        address: poolInfo.crvRewards.toLowerCase(),
        stakingToken: stakingTokenMap.get(poolInfo.crvRewards),
        rewards: rewardTokenMap.get(poolInfo.crvRewards),
        extra: {
          lpToken: poolInfo.lptoken.toLowerCase(),
          token: poolInfo.token.toLowerCase(),
          gauge: poolInfo.gauge.toLowerCase(),
          crvRewards: poolInfo.crvRewards.toLowerCase(),
        },
      });
    });
  }

  private async formatTokens(
    rawPools: ConvexPoolInfo[],
    rawTokens: LiquidityPoolTokenDto[],
    rewardTokens: Map<string, CallData>,
    virtualRewardAddress: Map<string, CallData>,
    rewardPoolLengths: Map<string, CallData>,
  ): Promise<
    [Map<Address, IntegrationERC20TokenDto>, Map<Address, IntegrationClaimableTokenDto[]>]
  > {
    const rawTokenMap = new Map(rawTokens.map((t) => [t.address, t]));
    const stakingMap = new Map<Address, IntegrationERC20TokenDto>();
    const rewardMap = new Map<Address, IntegrationClaimableTokenDto[]>();

    const balances = await this.multicallService.handleInBatches(
      new Map(
        rawPools.map((poolInfo) => {
          const lpToken = new ERC20(poolInfo.lptoken);
          return [
            `${poolInfo.gauge}-${poolInfo.lptoken}-balance`,
            lpToken.balanceOf(poolInfo.gauge),
          ];
        }),
      ),
      this.chain,
    );

    // Format Rewards &
    rawPools.forEach((poolInfo) => {
      // Staking Token
      const rawStakingToken = rawTokenMap.get(poolInfo.lptoken.toLowerCase());
      const stakingToken: IntegrationERC20TokenDto = this.convertTokenClassType(
        IntegrationERC20TokenDto,
        rawStakingToken,
      );
      stakingToken.balance = normalizeDecimals(
        balances.get(`${poolInfo.gauge}-${poolInfo.lptoken}-balance`).output.data.toString(),
        stakingToken.decimals,
      );

      stakingMap.set(poolInfo.crvRewards, stakingToken);

      // Reward Token
      const extraRewardPoolLength = rewardPoolLengths
        .get(poolInfo.crvRewards)
        .output.data.toString();

      const rewards = Array.from(Array(parseInt(extraRewardPoolLength, 10)).keys())
        .map((pool) => {
          const virtual = virtualRewardAddress
            .get(`${poolInfo.crvRewards}-${pool}`)
            .output.data.toString()
            .toLowerCase();

          const rewardAddress = rewardTokens.get(virtual).output.data.toString().toLowerCase();
          return rawTokenMap.get(rewardAddress);
        })
        .concat(rawTokenMap.get(CRV_ADDRESS));

      rewardMap.set(
        poolInfo.crvRewards,
        rewards.map((reward) => {
          return this.convertTokenClassType(IntegrationClaimableTokenDto, reward);
        }),
      );
    });

    return [stakingMap, rewardMap];
  }

  private async getBoosterPoolInfo(): Promise<ConvexPoolInfo[]> {
    const boosterContract = new ConvexBooster(CONVEX_BOOSTER);

    const [poolLength] = await this.getMulticallValues([boosterContract.poolLength()]);
    return this.getMulticallValues(
      Array.from(Array(parseInt(poolLength, 10)).keys()).map((poolId) =>
        boosterContract.poolInfo(poolId),
      ),
    );
  }

  private async getUnderlyingBalances(
    stakingPositions: IntegrationStakingPositionDto[],
  ): Promise<[Map<any, any>, Set<any>]> {
    const addresses = stakingPositions.map((t) => t.extra.lpToken.toLowerCase());
    const balances = new Map();
    const [cryptoSwapPools, mainPools, factoryPools] = await Promise.all([
      this.getCryptoSwapRegistryPoolsFromLp(addresses),
      this.getMainRegistryPools(addresses),
      // this is just used as a fallback. if the pair is included above, then the above will be more relavent as it will hold underlying tokend balances as well
      this.getFactoryPoolsPoolsFromLp(addresses),
    ]);

    addresses.forEach((lpToken) => {
      balances.set(
        lpToken,
        // Get Balance info in order of precedence
        mainPools.get(lpToken) ?? cryptoSwapPools.get(lpToken) ?? factoryPools.get(lpToken),
      );
    });

    // 'factory' tokens need price to be calulated based on reserves
    // of LP instead of totalSupply Of Token. this is becuase the
    // reserves we track are reserves in the context of the token being
    // a primitive i.e. in 0xc270b3B858c335B6BA5D5b10e2Da8a09976005ad
    // USDP-3CRV, the underlying reserves for 3crv are relative to
    // the USDP-3CRV pool, _not_ the stand alone 3crv pool. Other
    // pools use 3CRV as its own token, so the underlying reserves
    // aren't reliable and totalSupply ust be used. The one exception here
    // is '0x3b6831c0077a1e44ed0a21841c3bc4dc11bce833' which is hardcoded below
    const calculatePriceFromTotalSupply = new Set(
      Array.from(factoryPools.entries()).flatMap(([lp, map]) => {
        if (!map.size) return [];
        if (mainPools.has(lp)) return [];
        if (cryptoSwapPools.get(lp)) return [];
        return [lp];
      }),
    );
    calculatePriceFromTotalSupply.add('0x3b6831c0077a1e44ed0a21841c3bc4dc11bce833');

    return [balances, calculatePriceFromTotalSupply];
  }

  private async getFactoryPoolsPoolsFromLp(addresses: Address[]) {
    const factory = new CurveFactory(FACTORY_REGISTRY);

    const poolsResponse = await this.multicallService.handleInBatches(
      new Map(
        addresses.flatMap((address) => {
          return [
            [`${address}-coins`, factory.getCoins(address)],
            [`${address}-balances`, factory.getBalances(address)],
          ];
        }),
      ),
      this.chain,
    );

    const balanceResponses = new Map();
    addresses.forEach((address) => {
      // if (poolsResponse.get(`${address}-coins`).output.data[0] === ZERO_ADDRESS) return;

      const coins = poolsResponse.get(`${address}-coins`).output.data;
      const balances = poolsResponse.get(`${address}-balances`).output.data;
      const balanceMap = new Map();
      coins.forEach((coin, idx) => {
        if (coin === ZERO_ADDRESS && !Number(balances[idx].toString())) return;
        balanceMap.set(this.normalizeAddress(coin), balances[idx].toString());
      });
      balanceResponses.set(address, balanceMap);
    });
    return balanceResponses;
  }

  private async getMainRegistryPools(addresses: Address[]) {
    const registry = new CurveRegistry(CURVE_REGISTRY);

    const poolsResponse = await this.multicallService.handleInBatches(
      new Map(
        addresses.map((address) => {
          return [
            this.getPoolFromLpLabel(CURVE_REGISTRY, address),
            registry.getPoolFromLpToken(address),
          ];
        }),
      ),
      this.chain,
    );
    const pools = Array.from(poolsResponse.values()).filter(
      (r) => r.output.data.toString() !== ZERO_ADDRESS,
    );

    const virtualPrices = await this.multicallService.handleInBatches(
      new Map(
        pools.map((rawPool) => {
          return [
            `${rawPool.input.data[0]}-virtual-price`,
            registry.getVirtualPriceFromLpToken(rawPool.input.data[0]),
          ];
        }),
      ),
      this.chain,
    );

    const responses = await this.multicallService.handleInBatches(
      new Map(
        pools.flatMap((rawPool) => {
          const pool = rawPool.output.data.toString().toLowerCase();
          return [
            [`${pool}-coins`, registry.getCoins(pool)],
            [`${pool}-underlying-coins`, registry.getUnderlyingCoins(pool)],
            [`${pool}-balances`, registry.getBalances(pool)],
            [`${pool}-underlying-balances`, registry.getUnderlyingBalances(pool)],
          ];
        }),
      ),
      this.chain,
    );

    const balanceResponses = new Map();
    pools.forEach((rawPool) => {
      const pool = rawPool.output.data.toString().toLowerCase();
      const lpToken = rawPool.input.data[0];

      const coins = responses.get(`${pool}-coins`).output.data;
      const balances = responses.get(`${pool}-balances`).output.data;
      const underlyingCoins = responses.get(`${pool}-underlying-coins`).output.data;
      const underlyingBalances = responses.get(`${pool}-underlying-balances`).output.data;
      const balanceMap = new Map();
      coins.forEach((coin, idx) => {
        if (coin === ZERO_ADDRESS) return;
        balanceMap.set(this.normalizeAddress(coin), balances[idx].toString());
      });

      underlyingCoins.forEach((coin, idx) => {
        if (coin === ZERO_ADDRESS) return;
        balanceMap.set(this.normalizeAddress(coin), underlyingBalances[idx].toString());
      });

      balanceMap.set(
        'virtual-price',
        virtualPrices.get(`${lpToken}-virtual-price`).output.data.toString(),
      );

      balanceResponses.set(lpToken, balanceMap);
    });
    return balanceResponses;
  }

  private async getCryptoSwapRegistryPoolsFromLp(addresses: Address[]) {
    // get staking balance
    // get staking price
    // get underlying token balances
    const cryptoSwapRegistry = new CryptoSwapRegistry(CRYPTO_SWAP_REGISTRY);

    const poolsResponse = await this.multicallService.handleInBatches(
      new Map(
        addresses.map((address) => {
          return [
            this.getPoolFromLpLabel(CRYPTO_SWAP_REGISTRY, address),
            cryptoSwapRegistry.getPoolFromLpToken(address),
          ];
        }),
      ),
      this.chain,
    );
    const pools = Array.from(poolsResponse.values()).filter(
      (r) => r.output.data.toString() !== ZERO_ADDRESS,
    );

    const virtualPrices = await this.multicallService.handleInBatches(
      new Map(
        pools.map((rawPool) => {
          return [
            `${rawPool.input.data[0]}-virtual-price`,
            cryptoSwapRegistry.getVirtualPriceFromLpToken(rawPool.input.data[0]),
          ];
        }),
      ),
      this.chain,
    );

    const responses = await this.multicallService.handleInBatches(
      new Map(
        pools.flatMap((rawPool) => {
          const pool = rawPool.output.data.toString().toLowerCase();
          return [
            [`${pool}-n-coins`, cryptoSwapRegistry.getNCoins(pool)],
            [`${pool}-coins`, cryptoSwapRegistry.getCoins(pool)],
            [`${pool}-balances`, cryptoSwapRegistry.getBalances(pool)],
          ];
        }),
      ),
      this.chain,
    );

    // format as { [lpToken]: { [underlying]: balance } }
    const balanceResponses = new Map();
    pools.forEach((rawPool) => {
      const pool = rawPool.output.data.toString().toLowerCase();
      const lpToken = rawPool.input.data[0];

      const coinCount = Number(responses.get(`${pool}-n-coins`).output.data.toString());
      const underlying = responses.get(`${pool}-coins`).output.data.slice(0, coinCount);
      const balances = responses.get(`${pool}-balances`).output.data.slice(0, coinCount);
      const balanceMap = new Map(
        underlying.map((address, idx) => [
          this.normalizeAddress(address),
          balances[idx].toString(),
        ]),
      );
      balanceMap.set(
        'virtual-price',
        virtualPrices.get(`${lpToken}-virtual-price`).output.data.toString(),
      );
      balanceResponses.set(lpToken, balanceMap);
    });
    return balanceResponses;
  }

  private async getRewardsForPool(pool: Address): Promise<Address[]> {
    const rewardPool = new CvxRewardPool(pool);

    // Get extra reward length
    const [extraRewardLength] = await this.getMulticallValues([rewardPool.extraRewardsLength()]);

    // get all extra reward pools
    const virtualRewardPools = await this.getMulticallValues(
      Array.from(Array(parseInt(extraRewardLength, 10)).keys()).map((pool: number) => {
        return rewardPool.extraRewards(pool);
      }),
    );

    // Get tokens for all extra reward pools
    const extraRewardTokens = await this.getMulticallValues(
      virtualRewardPools.map((virtualRewardPool) => {
        const contract = new VirtualBalanceRewardPool(virtualRewardPool.toString());
        return contract.rewardToken();
      }),
    );

    return extraRewardTokens;
  }

  private async getCVXCRVStaking() {
    // Test Address: 0xd34c226cd4d3261311d09bc520000e537b98e16e
    const extraRewardTokens = await this.getRewardsForPool(CRVCVX_REWARD_POOL_ADDRESS);

    const [stakingToken, ...rewards] = await this.saveAssets([
      CVX_CRV_ADDRESS,
      CRV_ADDRESS,
      ...extraRewardTokens.map((reward) => reward.toString().toLowerCase()),
    ]);

    // For the front end
    return plainToClass(IntegrationStakingPositionDto, {
      address: CRVCVX_REWARD_POOL_ADDRESS,
      stakingToken: this.convertTokenClassType(IntegrationERC20TokenDto, stakingToken),
      rewards: rewards.map((reward) =>
        this.convertTokenClassType(IntegrationClaimableTokenDto, reward),
      ),
    });
  }

  /**
   * Gets the pool data for plain CVX staking
   *
   * @returns Promise<IntegrationStakingPositionDto>
   */
  private async getCVXStaking() {
    const [stakingToken, rewardToken] = await this.saveAssets([CVX_ADDRESS, CVX_CRV_ADDRESS]);
    return plainToClass(IntegrationStakingPositionDto, {
      address: CVX_REWARD_POOL_ADDRESS,
      stakingToken: this.convertTokenClassType(IntegrationERC20TokenDto, stakingToken),
      rewards: [this.convertTokenClassType(IntegrationClaimableTokenDto, rewardToken)],
    });
  }

  /**
   * Converts a token returned from 'saveAsset' to
   * the required class type
   *
   * @param type ClassConstructor DTO to convert too
   * @param token LiquidityPoolTokenDto token to be converted
   * @returns IntegrationERC20TokenDto
   */
  private convertTokenClassType<
    T extends ERC20Token | IntegrationPoolTokenDto | IntegrationERC20TokenDto,
  >(type: ClassConstructor<T>, token: LiquidityPoolTokenDto): T {
    const data: T = plainToClass(type, {
      address: token.address.toLowerCase(),
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
    });

    if (
      token.underlyingAssets?.length &&
      (data instanceof IntegrationPoolTokenDto || data instanceof IntegrationERC20TokenDto)
    ) {
      data.tokens = token.underlyingAssets.map((token) =>
        this.convertTokenClassType(IntegrationPoolTokenDto, token),
      );
    }

    return data;
  }

  private async getMulticallValues(calls: CallData[]) {
    const callData = await this.multicallService.handleInBatches(
      new Map(calls.map((call, idx) => [idx.toString(), call])),
      this.chain,
    );

    return Array.from(callData.values()).map((cd) => cd.output.data);
  }

  /**
   * Updates the tracked vault with the latest information
   *
   * @param trackedVault Database entry for Tracked Vault
   * @param stakingFeatures All currently saved staking features
   * @returns Updated Tracked Vault
   */
  private async updateTrackedVaultWithStakingFeatures(
    trackedVault: TrackedVault,
    stakingFeatures: IntegrationStakingPositionDto[],
  ) {
    trackedVault.mapping = await Promise.all(
      stakingFeatures.map((stakingFeature) => this.toDbMapping(stakingFeature)),
    );
    trackedVault.updatedAt = new Date();
    const updatedVault = await this.storeService.updateMapping(trackedVault);
    TrackedVaultsMap.add(updatedVault);
    return updatedVault;
  }

  /**
   * Converts the Staking Position/Feature to the raw database mapping
   *
   * @param stakingFeature
   * @returns database mapping
   */
  private async toDbMapping(
    stakingFeature: IntegrationStakingPositionDto,
  ): Promise<StakingFeatureMapping> {
    const stakingFeatureUid = concatStrings(this.chain, stakingFeature.address, 'st');

    const stakingFeatureVaultItem = await this.getDbItem(stakingFeature, stakingFeatureUid);
    const rewardTokens = await this.getRewardTokensAsVaultItems(stakingFeature);
    const stakingToken = await this.getStakingTokenAsVaultItem(stakingFeature);

    return plainToClass(StakingFeatureMapping, {
      dbId: stakingFeatureVaultItem.id,
      dtoName: stakingFeature.constructor.name,
      rewards: rewardTokens,
      stakingToken: stakingToken,
    });
  }

  /**
   *
   * @param stakingFeature
   * @returns all rewards as database mappings
   */
  private async getRewardTokensAsVaultItems(stakingFeature: IntegrationStakingPositionDto) {
    return Promise.all(
      stakingFeature.rewards.map(async (reward) => {
        const uid = concatStrings(this.chain, reward.address);
        const vaultItem = await this.getDbItem(reward, uid);

        return plainToClass(FeatureMappingDbItem, {
          dbId: vaultItem.id,
          dtoName: reward.constructor.name,
        });
      }),
    );
  }

  /**
   *
   * @param stakingFeature
   * @returns staking token as database mapping
   */
  private async getStakingTokenAsVaultItem(
    stakingFeature: IntegrationStakingPositionDto,
  ): Promise<FeatureMappingStakingToken> {
    const uid = concatStrings(this.chain, stakingFeature.stakingToken.address);
    const vaultItem = await this.getDbItem(stakingFeature.stakingToken, uid);
    const lpTokens = await this.getStakingTokenUnderlying(stakingFeature.stakingToken.tokens);

    return plainToClass(FeatureMappingStakingToken, {
      dbId: vaultItem.id,
      dtoName: stakingFeature.stakingToken.constructor.name,
      tokens: lpTokens,
    });
  }

  private async getStakingTokenUnderlying(
    tokens: (IntegrationPoolTokenDto | UnderlyingStakingLp)[],
  ) {
    if (!tokens.length) {
      return [];
    }
    return Promise.all(
      tokens.map(async (token) => {
        const uid = concatStrings(this.chain, token.address);
        const vaultItem = await this.getDbItem(token, uid);

        const final = plainToClass(FeatureMappingStakingPoolToken, {
          dbId: vaultItem.id,
          dtoName: token.constructor.name,
          positionInPool: token.positionInPool,
          tokens: await this.getStakingTokenUnderlying(token.tokens),
        });
        return final;
      }),
    );
  }

  private normalizeAddress(address: Address): Address {
    return (
      address
        .toLowerCase()
        // Curve usess 0xeee to signify native eth
        .replace(/^0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee$/, ZERO_ADDRESS)
    );
  }
}
