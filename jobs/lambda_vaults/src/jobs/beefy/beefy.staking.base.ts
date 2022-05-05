import { plainToClass } from 'class-transformer';
import { catchError, EMPTY, filter, from, map, mergeMap, toArray } from 'rxjs';
import { lastValueFrom } from 'rxjs';

import { Address, ChainIdEnum, FeatureEnum, ProtocolNameEnum } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CallData } from '@app/common/dto/CallData';
import {
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { getUniqList, normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { SettingsService } from '../../store/service/settings.service';
import { StoreService } from '../../store/store.service';
import { TrackedVault } from '../../store/tracked.vault.entity';
import { TrackedVaultsMap } from '../data/tracked.vaults.map';
import { JobBase } from '../job.base';
import { JobInterface } from '../job.interface';
import { DbMapping } from '../utils/dbmapping';
import { BeefyApiService } from './beefy.api.service';
import { UniswapV2Pair } from './contracts/UniswapV2Pair';
import { AbstractStrategy } from './contracts/strategies/AbstractStrategy';
import { StrategyCakeLP } from './contracts/strategies/StrategyCakeLP';
import { StrategyCakeV2 } from './contracts/strategies/StrategyCakeV2';
import { StrategyCommonChefLp } from './contracts/strategies/StrategyCommonChefLp';
import { StrategySpaceLp } from './contracts/strategies/StrategySpaceLp';
import { StrategyXSyrup } from './contracts/strategies/StrategyXSyrup';
import { AbstractVault } from './contracts/vaults/AbstractVault';
import { BeefyBurningVault } from './contracts/vaults/BeefyBurningVault';
import { BeefyVaultV3 } from './contracts/vaults/BeefyVaultV3';
import { BeefyVaultV6 } from './contracts/vaults/BeefyVaultV6';
import { BeefyVaultV6Native } from './contracts/vaults/BeefyVaultV6Native';
import {
  IAssetDetailsResponse,
  IBeefyHttpVault,
  IBeefyStrategyAssets,
  IBeefyVaultDetails,
  IBeefyVaultInfo,
  IUniswapV2PoolInfo,
} from './interfaces';

export abstract class BeefyStakingBase
  extends JobBase<IntegrationStakingPositionDto>
  implements JobInterface
{
  chain: ChainIdEnum;
  feature = FeatureEnum.staking;
  protocol = ProtocolNameEnum.Beefy;
  placeholder: string;

  protected mapping = [];
  protected dbMapping: DbMapping;

  protected readonly api: BeefyApiService;
  protected readonly accountService: AccountService;
  protected readonly settingService: SettingsService; // TODO: Only required to satisfy JobBase (not used for staking)
  protected readonly priceService: PriceService;
  protected readonly storeService: StoreService;
  protected readonly multicallService: MulticallAggregator;

  async rebuildMapping(jobMapping: TrackedVault): Promise<TrackedVault> {
    this.logger.log('Building Job Mapping', this.placeholder);
    const vaults = await this.api.fetchVaults(this.chain);

    const stakingFeatures = await this.createStakingFeaturesFromVaults(vaults);

    jobMapping.mapping = await Promise.all(
      stakingFeatures.map((stakingFeature) =>
        this.dbMapping.toDbMapping(stakingFeature, this.chain),
      ),
    );

    const updatedMapping = await this.storeService.updateMapping(jobMapping);
    TrackedVaultsMap.add(updatedMapping);
    return updatedMapping;
  }

  async fillChainData(): Promise<IntegrationStakingPositionDto[]> {
    const supportedVaults = new Map<Address, IBeefyVaultDetails>();

    const aprs = await this.api.fetchAprs();

    const multicallPromises = this.mapping.map(async (m) => {
      const vault = await this.getBeefyVault(m);

      const strategy = await this.getBeefyStrategy(vault);

      if (vault && strategy) {
        supportedVaults.set(m.address, { vault, strategy });
      }
      return;
    });

    // Data is gathered in 'supportedVaults'.
    // this is to wait for everything above to complete
    await Promise.all(multicallPromises);

    // Get extra data not retrieved from above
    const { prices, totalSupplies, pools } = await this.fetchAssets(supportedVaults);

    // Loop through the staking positions & mutate the data
    const formattedVaults = [];
    this.mapping.forEach((stakingPosition: IntegrationStakingPositionDto) => {
      if (!supportedVaults.has(stakingPosition.address)) {
        return;
      }
      const { vault } = supportedVaults.get(stakingPosition.address);

      const balance = normalizeDecimals(vault.balance, vault.decimals);
      stakingPosition.stakingToken.balance = balance;

      const pricePerShare = normalizeDecimals(vault.getPricePerFullShare, vault.decimals);
      stakingPosition.extra.pricePerShare = pricePerShare;

      const totalSupply = normalizeDecimals(
        totalSupplies.get(stakingPosition.stakingToken.address),
        stakingPosition.stakingToken.decimals,
      );
      stakingPosition.stakingToken.totalSupply = totalSupply;

      // Fill in the missing price, value on the stakingToken
      // and update price, value, reserve, balance, totalSupply
      // on any underlying tokens
      if (pools.has(stakingPosition.stakingToken.address)) {
        // Uniswap Like Pair
        this.mutateUniswapPool(
          stakingPosition,
          prices,
          totalSupplies,
          pools.get(stakingPosition.stakingToken.address),
        );
      } else {
        // Single Staking
        this.mutateSingleTokenPool(stakingPosition, prices);
      }

      // All prices have been updated, Update total TVL
      stakingPosition.stats.tvl = stakingPosition.stakingToken.value;
      if (aprs[stakingPosition.extra.id]?.totalApy) {
        stakingPosition.stats.poolApy = aprs[stakingPosition.extra.id].totalApy * 100;
      }
      formattedVaults.push(stakingPosition);
    });

    this.logger.debug(
      `Beefy Vault Staking (Chain: ${this.chain}): Completed: ${formattedVaults.length} - Missed: ${
        this.mapping.length - formattedVaults.length
      }`,
    );
    return formattedVaults;
  }

  private mutateSingleTokenPool(
    stakingPosition: IntegrationStakingPositionDto,
    prices: Map<Address, number>,
  ) {
    stakingPosition.stakingToken.price = prices.get(stakingPosition.stakingToken.address);
    stakingPosition.stakingToken.value =
      stakingPosition.stakingToken.price * stakingPosition.stakingToken.balance;
  }

  private mutateUniswapPool(
    stakingPosition: IntegrationStakingPositionDto,
    prices: Map<Address, number>,
    totalSupplies: Map<Address, string>,
    pool: IUniswapV2PoolInfo,
  ) {
    // Pool Share of total staked TVL vs total LP
    const poolShare =
      stakingPosition.stakingToken.balance / stakingPosition.stakingToken.totalSupply;

    stakingPosition.stakingToken.tokens.forEach((token) => {
      token.price = prices.get(token.address);

      const isToken0 = token.address === pool.token0;
      const totalLpReserve = isToken0
        ? normalizeDecimals(pool.reserve0, token.decimals)
        : normalizeDecimals(pool.reserve1, token.decimals);

      token.totalSupply = normalizeDecimals(totalSupplies.get(token.address), token.decimals);
      token.reserve = totalLpReserve;
      token.balance = totalLpReserve * poolShare;
      token.value = token.price * token.balance;

      // Update stakingToken value & TVL
      stakingPosition.stakingToken.value += token.value;
    });

    // Calculate Price based on underlying value
    stakingPosition.stakingToken.price =
      stakingPosition.stakingToken.value / stakingPosition.stakingToken.balance;
  }

  private async fetchTotalSupplies(addresses: Address[]): Promise<Map<Address, string>> {
    const calls = new Map(
      addresses.map((address) => {
        const contract = new ERC20(address);
        return [address, contract.totalSupply()];
      }),
    );

    const responsesRaw = await this.multicall(calls);

    const responses = new Map();
    responsesRaw.forEach((callData, address) =>
      responses.set(address, callData.output.data.toString()),
    );

    return responses;
  }

  private async fetchLpInfo(addresses: Address[]): Promise<Map<Address, IUniswapV2PoolInfo>> {
    const callGroup = addresses.map((address) => {
      const contract = new UniswapV2Pair(address);
      return new Map<string, CallData>([
        [`reserves`, contract.getReserves()],
        [`token0`, contract.token0()],
        [`token1`, contract.token1()],
      ]);
    });

    // TODO: rxjs
    const results = await lastValueFrom(
      from(callGroup).pipe(
        mergeMap((calls) => this.multicall(calls)),

        // Just Skip Failed Calls
        catchError(() => EMPTY),

        filter((result) => !!result),

        map((result): [string, IUniswapV2PoolInfo] => [
          result.get('reserves').address.toLowerCase(),
          {
            // eslint-disable-next-line no-underscore-dangle
            reserve0: result.get('reserves').output.data._reserve0.toString(),
            // eslint-disable-next-line no-underscore-dangle
            reserve1: result.get('reserves').output.data._reserve1.toString(),
            token0: result.get('token0').output.data.toString().toLowerCase(),
            token1: result.get('token1').output.data.toString().toLowerCase(),
          },
        ]),

        toArray(),
      ),
    );

    return new Map(results);
  }

  private async fetchAssets(
    supportedVaults: Map<Address, IBeefyVaultDetails>,
  ): Promise<IAssetDetailsResponse> {
    const vaultArray = Array.from(supportedVaults.values());

    const allAddresses = getUniqList(
      vaultArray.flatMap(({ strategy }) => [
        strategy.want,
        strategy.output,
        ...strategy.underlying,
      ]),
    );

    const poolAddresses = getUniqList(
      vaultArray
        .filter(({ strategy }) => strategy.underlying.length)
        .flatMap(({ strategy }) => strategy.want),
    );

    const [pools, totalSupplies, prices] = await Promise.all([
      this.fetchLpInfo(poolAddresses),
      this.fetchTotalSupplies(allAddresses),
      this.fetchPrices(allAddresses),
    ]);

    return {
      prices,
      totalSupplies,
      pools,
    };
  }

  async getBeefyVault(stakingPosition: IntegrationStakingPositionDto): Promise<IBeefyVaultInfo> {
    // Try/Catch each available Beefy Vault to get the right one & normalize the data
    const strategies = [BeefyVaultV6, BeefyVaultV6Native, BeefyVaultV3, BeefyBurningVault];

    for (const Strategy of strategies) {
      // Try/Catch each available Beefy Strategy to get the right one & normalize the data
      try {
        return await this.attemptVault(
          stakingPosition.address,
          new Strategy(stakingPosition.address),
          (vault) => ({
            totalSupply: vault.totalSupply(),
            strategy: vault.strategy(), // can get from api (strategy)
            want: vault.want(), // can get from api (tokenAddress)
            balance: vault.balance(),
            getPricePerFullShare: vault.getPricePerFullShare(),
            decimals: vault.decimals(),
          }),
        );
      } catch {
        // Multicall Failed, Attempting Next Strategy
      }
    }

    this.logger.warn(`Failed Vault: ${stakingPosition.address}`, `Beefy - (${this.chain})`);
    return;
  }

  async getBeefyStrategy(vault: IBeefyVaultInfo): Promise<IBeefyStrategyAssets> {
    const pairStrategies = [StrategyCommonChefLp, StrategySpaceLp, StrategyCakeLP];
    const singleStakeStrategies = [StrategyXSyrup, StrategyCakeV2];

    for (const PairStrategy of pairStrategies) {
      // Try/Catch each available Beefy Strategy to get the right one & normalize the data
      try {
        return await this.attemptStrategy(new PairStrategy(vault.strategy), (strategy) => ({
          underlying: [strategy.lpToken0(), strategy.lpToken1()],
          output: strategy.output(),
          want: strategy.want(),
        }));
      } catch {
        // Multicall Failed, Attempting Next Strategy
      }
    }

    for (const SingleStrategy of singleStakeStrategies) {
      try {
        return await this.attemptStrategy(new SingleStrategy(vault.strategy), (strategy) => ({
          underlying: [],
          output: strategy.output(),
          want: strategy.want(),
        }));
      } catch {
        // Multicall Failed, Attempting Next Strategy
      }
    }

    // All Strategies Failed. Watch for logs later
    this.logger.warn(`Failed Strategy for Vault ${vault.address}`, `Beefy - (${this.chain})`);
    return;
  }

  private async attemptVault(
    address: string,
    vault: AbstractVault,
    cb: (vault: AbstractVault) => IBeefyVaultInfo<CallData>,
  ): Promise<IBeefyVaultInfo> {
    // Create user keyed Object
    const callObj = cb(vault);

    const responses = await this.multicall(new Map(Object.entries(callObj)));

    return {
      // TODO:
      address: address,
      totalSupply: responses.get('totalSupply').output.data.toString(),
      strategy: responses.get('strategy').output.data.toString(),
      want: responses.get('want').output.data.toString(),
      balance: responses.get('balance').output.data.toString(),
      getPricePerFullShare: responses.get('getPricePerFullShare').output.data.toString(),
      decimals: responses.get('decimals').output.data.toString(),
    };
  }

  private async attemptStrategy(
    strategy: AbstractStrategy,
    cb: (strategy: AbstractStrategy) => IBeefyStrategyAssets<CallData>,
  ): Promise<IBeefyStrategyAssets> {
    // Create user keyed Object
    const callObj = cb(strategy);

    // Convert IBeefyStrategyAssets<CallData> to callable Map
    const calls = new Map<string, any>([
      // eslint-disable-next-line no-unsafe-optional-chaining
      ...callObj.underlying?.map((call, idx): [string, CallData] => [`lpToken${idx}`, call]),
      ['output', callObj.output],
      ['want', callObj.want],
    ]);

    // Execute query
    const responses = await this.multicall(calls);

    // Return formatted response
    return {
      underlying:
        callObj.underlying?.map((call, idx) =>
          responses.get(`lpToken${idx}`)?.output.data.toString().toLowerCase(),
        ) ?? [],
      output: responses.get('output').output.data.toString().toLowerCase(),
      want: responses.get('want').output.data.toString().toLowerCase(),
    };
  }
  async createStakingFeaturesFromVaults(
    vaults: IBeefyHttpVault[],
  ): Promise<IntegrationStakingPositionDto[]> {
    const stakingFeatures: IntegrationStakingPositionDto[] = [];

    const promises = vaults.map(async (vault) => {
      try {
        const stakingPoolFeature = await this.createStakingPoolFeature(
          vault.earnContractAddress,
          vault.name,
          vault.tokenAddress ?? ZERO_ADDRESS,
          { id: vault.id },
        );
        stakingFeatures.push(stakingPoolFeature);
      } catch (e) {
        this.logger.error(
          `error to get token data from account service, chain [${this.chain}], address [${vault.earnContractAddress}]`,
          this.placeholder,
        );
      }
    });

    await Promise.all(promises);

    return stakingFeatures;
  }

  async createStakingPoolFeature(
    address: Address,
    name: string,
    underlying: Address,
    extra: any,
  ): Promise<IntegrationStakingPositionDto> {
    const stakingToken = await this.createStakingToken(underlying);

    return plainToClass(IntegrationStakingPositionDto, {
      address: address, // vault contract
      poolName: name, // vault name
      rewards: [],
      stakingToken: stakingToken, // underlying token
      extra,
    });
  }

  async createStakingToken(address: Address): Promise<IntegrationERC20TokenDto> {
    const poolTokenData = await this.saveAsset(address);

    const stakingToken = plainToClass(IntegrationERC20TokenDto, {
      address: poolTokenData.address,
      name: poolTokenData.name,
      symbol: poolTokenData.symbol,
      decimals: poolTokenData.decimals,
    });

    stakingToken.tokens = poolTokenData.underlyingAssets?.map((pt) => {
      return plainToClass(IntegrationPoolTokenDto, {
        address: pt.address,
        name: pt.name,
        symbol: pt.symbol,
        decimals: pt.decimals,
        positionInPool: pt.positionInPool,
      });
    });

    return stakingToken;
  }
}
