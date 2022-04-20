import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';

import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  ERC20TokenDto,
  FeatureEnum,
  IntegrationClaimableTokenDto,
  Logger,
  PoolTokenDto,
  ProtocolTypeEnum,
} from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { LiquidityPoolFeature } from '@app/common/dto/liquidity.pool.dto';
import { ChainAbbrEnum, ChainIdEnum, ProjectEnum, QuickswapProtocolEnum } from '@app/common/enum';
import { chunk } from '@app/common/utils';
import { normalizeDecimals } from '@app/common/utils/number';
import { getKey } from '@app/common/utils/string';
import { Web3ProviderService } from '@app/common/web3provider';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IntegrationERC20TokenDto, IntegrationStakingPositionDto } from '../../../../common/dto';
import { Asset, BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { QuickswapSubgraph } from '../../../subgraphs/subgraphs/quickswap.subgraph';
import { Mapper } from '../../helpers/mappers/mapper';
import AbstractProtocol from '../abstractProtocol';
import BasicProtocol from '../basicProtocol';
import { QuickswapDualRewards } from './contracts/QuickswapDualRewards';
import { QuickswapStakingRewards } from './contracts/QuickswapStakingRewards';
import {
  QUICKSWAP_ADDITIONAL_PAIRS,
  QUICKSWAP_REWARDS_DUAL_TOKEN_ADDRESS,
  QUICKSWAP_REWARDS_TOKEN_ADDRESS,
} from './contracts/quickswap.constants';
import { PairDto } from './dto/pair.dto';
import { QuickswapHttpService } from './quickswap.http.service';
import { IContractInfo, IQuickswapResponse } from './quickswap.interfaces';

@Injectable()
export class QuickswapProtocol extends BasicProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.plg];
  readonly project = ProjectEnum.quickswap;
  readonly name = QuickswapProtocolEnum.quickswap;
  readonly displayName = 'Quickswap';
  readonly features = {
    [ChainAbbrEnum.plg]: [
      FeatureEnum.pools, //
      FeatureEnum.staking,
    ],
  };
  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: QuickswapSubgraph,
    protected readonly mapper: Mapper,
    protected readonly httpService: QuickswapHttpService,
    protected readonly web3Provider: Web3ProviderService,
    protected readonly multicall: MulticallAggregator,
    @Inject(CACHE_MANAGER) protected readonly cache: Cache,
  ) {
    super();
  }

  private balanceLabel(token: Address, user: Address) {
    return `balanceOf_${token}_${user}`;
  }

  private earnedLabel(token: Address, user: Address, type = 'single') {
    return `earned_${token}_${user}_${type}`;
  }

  private async getOrSet<T>(ttl: number, key: string, callback: () => Promise<T>) {
    const cachedData = await this.cache.get<T>(key);
    if (cachedData) {
      return cachedData;
    }

    const data = await callback();
    await this.cache.set(key, data, { ttl });
    return data;
  }

  static LocalCachedPairData: Promise<PairDto[]> | null = null;
  private async getSubgraphPairs(pairsAddresses: Address[], chunkSize = 100): Promise<PairDto[]> {
    // Cache Shared pool data statically so that staking+pools only need 1 request
    if (QuickswapProtocol.LocalCachedPairData) {
      return QuickswapProtocol.LocalCachedPairData;
    }

    QuickswapProtocol.LocalCachedPairData = this.getOrSet(
      // enforce short ttl as balance math depends on reserves/price.
      // Ideally we don't cache this at all, however it took 4+ seconds
      // to resolve each request in testing
      60,
      getKey('QuickSwap', 'subgraph', 'pairs', ...pairsAddresses.sort()),
      async () => {
        const chunkedPairs = await Promise.all(
          chunk(pairsAddresses, chunkSize)
            .map(async (chunkedPairsAddresses): Promise<PairDto[]> => {
              const { data: pairsData, errors: pairsErrors } = await this.subgraph.getPairs(
                chunkedPairsAddresses,
              );
              if (pairsErrors?.length) {
                // Error logged in subgraph request
                this.logger.error('QuickSwap Subgraph Failed', this.constructor.name);
                return [];
              } else {
                if (pairsData.pairs.length !== chunkedPairsAddresses.length) {
                  this.logger.warn(
                    `Subgraph failed to return some pairs. ${pairsData.pairs.length}/${chunkedPairsAddresses.length} Found`,
                    this.constructor.name,
                  );
                }
                return pairsData.pairs;
              }
            })
            .flat(),
        );

        return chunkedPairs.flat();
      },
    );

    return QuickswapProtocol.LocalCachedPairData;
  }

  private async getAvailablePools(): Promise<IQuickswapResponse> {
    return this.getOrSet(
      // cache for 6 hours. only needs refreshing when quickswap adds a new pool
      // and since we are fetching from github, this will be faster, and
      // will reduce rate limiting
      60 * 60 * 6,
      getKey('QuickSwap', 'http', 'staking-contracts'),
      () => this.httpService.getStakingPools(),
    );
  }

  private async getSubgraphPairMap(addresses: Address[]) {
    const stakingPairsData = await this.getSubgraphPairs(addresses);

    const stakingTokens = new Map<string, PairDto>();

    stakingPairsData.forEach((pairData) => {
      stakingTokens.set(pairData.id.toLowerCase(), pairData);
    });

    return stakingTokens;
  }

  private getLPTokens({ reserveUSD, ...data }: PairDto, poolShare: number): PoolTokenDto[] {
    return [0, 1].map((position) => {
      const { token, reserve } = {
        token: data[`token${position}`],
        reserve: data[`reserve${position}`],
      };

      const { id: address, name, symbol, decimals } = token;

      const price = new BigNumber(reserveUSD) //
        .div(2)
        .div(reserve)
        .toNumber();

      const balance = new BigNumber(poolShare) //
        .times(reserve)
        .toString();

      const value = new BigNumber(balance) //
        .times(price)
        .toNumber();

      return {
        address,
        name,
        symbol,
        decimals: +decimals,
        price,
        reserve,
        balance,
        value,
      };
    });
  }

  private async getSinglePricedToken(address: Address, chain: ChainDto) {
    const [{ data: rawRewardTokens }, { prices }] = await Promise.all([
      this.accountService.getAssets([address], [chain.id]),
      this.priceService.getTokenPricesFetch([address], chain.id),
    ]);

    return { token: rawRewardTokens[0], price: prices[address] };
  }

  /**
   * @description get information from 2 tokens rewards.
   */
  private async getDualPricedToken(addresses: Address[], chain: ChainDto) {
    const [{ data: rawTokenRewards }, { prices: rawRewardsPrice }] = await Promise.all([
      this.accountService.getAssets(addresses, [chain.id]),
      this.priceService.getTokenPricesFetch(addresses, chain.id),
    ]);

    const tokenPriceA = rawRewardsPrice[addresses[0]],
      tokenPriceB = rawRewardsPrice[addresses[1]];

    return { rawTokenRewards, rawRewardsPrice: [tokenPriceA, tokenPriceB] };
  }

  private async getMulticallData(
    stakingContracts: any,
    dualStakingContracts: any,
    users: Address[],
  ) {
    const calls = new Map();
    const contracts = [].concat(stakingContracts, dualStakingContracts);

    contracts.forEach((data) => {
      const c = new ERC20(data.pairAddress);
      calls.set(
        this.balanceLabel(data.pairAddress, data.stakingContractAddress),
        c.balanceOf(data.stakingContractAddress),
      );
    });

    users.forEach((user) => {
      contracts.forEach((data) => {
        const c = new ERC20(data.stakingContractAddress);
        // balance
        calls.set(this.balanceLabel(data.stakingContractAddress, user), c.balanceOf(user));

        const p = new ERC20(data.pairAddress);
        calls.set(this.balanceLabel(data.pairAddress, user), p.balanceOf(user));
      });

      // get earned
      stakingContracts.forEach((data) => {
        const c = new QuickswapStakingRewards(data.stakingContractAddress);
        calls.set(this.earnedLabel(data.stakingContractAddress, user), c.earned(user));
      });

      // get earned dual
      dualStakingContracts.forEach((data) => {
        const c = new QuickswapDualRewards(data.stakingContractAddress);
        calls.set(this.earnedLabel(data.stakingContractAddress, user, 'A'), c.earnedA(user));
        calls.set(this.earnedLabel(data.stakingContractAddress, user, 'B'), c.earnedB(user));
      });
    });

    return this.multicall.handleInBatches(calls, ChainIdEnum.plg);
  }

  public async getStakingPositionsV2(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const baseData: BaseData[] = [];

    const { stakingContracts, dualStakingContracts } = await this.getAvailablePools();

    const pairAddresses = Array.from(
      new Set(
        []
          .concat(stakingContracts, dualStakingContracts)
          .map(({ pairAddress }) => pairAddress)
          .concat(QUICKSWAP_ADDITIONAL_PAIRS),
      ),
    );

    const { token: rawRewardToken, price: rawRewardPrice } = await this.getSinglePricedToken(
      QUICKSWAP_REWARDS_TOKEN_ADDRESS,
      chain,
    );

    const { rawTokenRewards, rawRewardsPrice } = await this.getDualPricedToken(
      QUICKSWAP_REWARDS_DUAL_TOKEN_ADDRESS,
      chain,
    );

    const stakingTokens = await this.getSubgraphPairMap(pairAddresses);

    const multicallData = await this.getMulticallData(
      stakingContracts,
      dualStakingContracts,
      addresses,
    );

    await Promise.all(
      addresses.map(async (userAddress) => {
        const poolPositionItems = this.getLiquidityPoolPositionItems(
          pairAddresses,
          multicallData,
          stakingTokens,
          userAddress,
        );

        const stakingPositionItems = this.getStakingPositionItems(
          stakingContracts,
          stakingTokens,
          multicallData,
          rawRewardToken,
          rawRewardPrice,
          userAddress,
        );

        const stakingDualPositionItems = this.getDualStakingPositionItems(
          dualStakingContracts,
          stakingTokens,
          multicallData,
          rawTokenRewards,
          rawRewardsPrice,
          userAddress,
        );

        baseData.push(
          plainToClass(BaseDataLp, {
            chain: chain,
            userAddress,
            items: poolPositionItems,
            feature: FeatureEnum.pools,
            projectName: ProjectEnum.quickswap,
            protocolType: ProtocolTypeEnum.amm,
          }),

          plainToClass(BaseDataStaking, {
            chain: chain,
            userAddress,
            items: [...stakingPositionItems, ...stakingDualPositionItems],
            feature: FeatureEnum.staking,
            projectName: ProjectEnum.quickswap,
            protocolType: ProtocolTypeEnum.staking,
          }),
        );
      }),
    );

    return baseData;
  }

  private getLiquidityPoolPositionItems(
    pairAddresses: Address[],
    multicallInfo: Map<string, CallData>,
    stakingTokens: Map<string, PairDto>,
    userAddress: Address,
  ) {
    const poolPositionItems = [];
    pairAddresses.forEach((address) => {
      const rawBalance = multicallInfo.get(this.balanceLabel(address, userAddress));

      const balance = rawBalance?.output.data.toString();

      if (!Number(balance)) return;

      const pool = stakingTokens.get(address);

      const poolShare = new BigNumber(normalizeDecimals(balance, 18)) //
        .div(pool.totalSupply)
        .toNumber();

      poolPositionItems.push(
        plainToClass(LiquidityPoolFeature, {
          address: address,
          lpToken: plainToClass(ERC20TokenDto, {
            address: address,
            name: 'Uniswap V2', // Yes quickswap pair token is called Uniswap V2
            symbol: 'UNI-V2',
            decimals: 18,
            totalSupply: pool.totalSupply,
          }),
          tokens: this.getLPTokens(pool, poolShare),
        }),
      );
    });

    return poolPositionItems;
  }

  private getStakingPositionItems(
    contracts: IContractInfo[],
    stakingTokens: Map<string, PairDto>,
    multicallData: Map<string, CallData>,
    rawRewardToken: Asset,
    rawRewardPrice: number,
    userAddress: Address,
  ) {
    const stakingPositions: IntegrationStakingPositionDto[] = [];
    const LP_TOKEN_DECIMALS = 18;

    contracts.forEach(({ pairAddress, stakingContractAddress }) => {
      const pairData = stakingTokens.get(pairAddress);
      if (!pairData) {
        this.logger.warn(`Failed to find pair data ${pairAddress}`, this.constructor.name);
        return;
      }

      const rawBalance = multicallData
        .get(this.balanceLabel(stakingContractAddress, userAddress))
        .output.data.toString();

      const balance = normalizeDecimals(rawBalance, LP_TOKEN_DECIMALS).toString();

      // Filter out unstaked
      if (!Number(balance)) return;

      const claimable = multicallData
        .get(this.earnedLabel(stakingContractAddress, userAddress))
        .output.data.toString();

      const claimableDataBalance = normalizeDecimals(claimable, rawRewardToken.decimals).toString();

      const poolShare = Number(balance) / Number(pairData.totalSupply);

      const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
        address: QUICKSWAP_REWARDS_TOKEN_ADDRESS,
        name: rawRewardToken.name,
        symbol: rawRewardToken.symbol,
        decimals: rawRewardToken.decimals,
        totalSupply: rawRewardToken.totalSupply,
        price: rawRewardPrice,
        claimableData: {
          balance: claimableDataBalance,
          value: new BigNumber(claimableDataBalance) //
            .times(rawRewardPrice)
            .toString(),
        },
      });

      const stakingToken = plainToClass(IntegrationERC20TokenDto, {
        address: pairAddress,
        name: 'Uniswap V2',
        symbol: 'UNI-V2',
        decimals: 18,
        tokens: this.getLPTokens(pairData, poolShare),
      });

      stakingPositions.push(
        plainToClass(IntegrationStakingPositionDto, {
          address: stakingContractAddress,
          staked: balance,
          stakingToken,
          rewards: [rewardToken],
        }),
      );
    });

    return stakingPositions;
  }

  private getDualStakingPositionItems(
    contracts: { stakingContractAddress: Address; pairAddress: Address }[],
    stakingTokens: Map<string, PairDto>,
    multicallData: Map<string, CallData>,
    rawRewardToken: Asset[],
    rawRewardPrice: number[],
    userAddress: Address,
  ) {
    const stakingPositions: IntegrationStakingPositionDto[] = [];
    const [rewardTokenA, rewardTokenB] = rawRewardToken;
    const [rewardPriceA, rewardPriceB] = rawRewardPrice;
    const LP_TOKEN_DECIMALS = 18;

    for (const { pairAddress, stakingContractAddress } of contracts) {
      const rawBalance = multicallData
        .get(this.balanceLabel(stakingContractAddress, userAddress))
        .output.data.toString();

      const balance = normalizeDecimals(rawBalance, LP_TOKEN_DECIMALS);

      if (!balance) continue;

      const claimableA = multicallData
        .get(this.earnedLabel(stakingContractAddress, userAddress, 'A'))
        .output.data.toString();
      const claimableB = multicallData
        .get(this.earnedLabel(stakingContractAddress, userAddress, 'B'))
        .output.data.toString();

      const dualRewardsPair: [Asset, number, string][] = [
        [rewardTokenA, rewardPriceA, claimableA],
        [rewardTokenB, rewardPriceB, claimableB],
      ];

      const rewardToken = [];

      for (const [token, price, claimable] of dualRewardsPair) {
        const claimableDataBalance = normalizeDecimals(claimable, token.decimals).toString();

        rewardToken.push(
          plainToClass(IntegrationClaimableTokenDto, {
            address: token.address,
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            totalSupply: token.totalSupply,
            price: price,
            claimableData: {
              balance: claimableDataBalance,
              value: new BigNumber(claimableDataBalance) //
                .times(price)
                .toString(),
            },
          }),
        );
      }

      const pairData = stakingTokens.get(pairAddress);
      const poolShare = balance / Number(pairData.totalSupply);

      const stakingToken = plainToClass(IntegrationERC20TokenDto, {
        address: pairAddress,
        name: 'Uniswap V2',
        symbol: 'UNI-V2',
        decimals: LP_TOKEN_DECIMALS,
        tokens: this.getLPTokens(pairData, poolShare),
      });

      stakingPositions.push(
        plainToClass(IntegrationStakingPositionDto, {
          address: stakingContractAddress,
          staked: balance,
          stakingToken,
          rewards: rewardToken,
        }),
      );
    }

    return stakingPositions;
  }

  public async getFeatureData(
    addresses: Address[],
    chain: ChainDto,
    feature: FeatureEnum,
  ): Promise<BaseData[]> {
    switch (feature) {
      case FeatureEnum.staking:
        return this.getStakingPositionsV2(addresses, chain);
      default:
        return [];
    }
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const chainFeatures = await Promise.allSettled(
      this.features[chain.abbr].map((f) => {
        return this.getFeatureData(addresses, chain, f);
      }),
    );

    const data = [];
    const errors = [];
    chainFeatures.forEach((r) => {
      if (r.status === 'fulfilled') {
        data.push(r.value);
      } else {
        this.logger.error(r.reason, r.reason.stack, QuickswapProtocol.name);
        errors.push(r.reason.toString());
      }
    });

    return [data.flat(), errors];
  }
}

export default QuickswapProtocol;
