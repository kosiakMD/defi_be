import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  Logger,
  ChainAbbrEnum,
  ProjectEnum,
  SushiSwapProtocolEnum,
  IntegrationFeaturesDataDto,
  LiquidityPoolFeatureDto,
  FeatureResultDto,
  ERC20TokenDto,
  PoolTokenDto,
  CurrentPricesPayload,
  ChainIdEnum,
  LendingPositionDto,
  LendingErcToken,
  ProtocolTypeEnum,
} from '@app/common';
import { FeatureEnum, ProtocolNameEnum } from '@app/common';
import { ClaimableDto, IntegrationClaimableTokenDto } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { normalizeDecimals } from '@app/common/utils/number';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { LPToken, IntegrationStakingPositionDto } from '../../integrations/integrations.dto';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import BasicProtocol from './basicProtocol';
import { SushiSwapMasterChefAbi } from './sushiswap/abi/masterchef';
import { SushiSwapBentoBoxSubgraph } from './sushiswap/services/sushiswap.bentobox.subgraph';
import { SushiSwapExchangeSubgraph } from './sushiswap/services/sushiswap.exchange.subgraph';
import { SushiSwapMasterChefSubgraph } from './sushiswap/services/sushiswap.masterchef.subgraph';
import { SushiSwapMiniChefSubgraph } from './sushiswap/services/sushiswap.minichef.subgraph';
import { SushiSwapSushiBarSubgraph } from './sushiswap/services/sushiswap.sushibar.subgraph';
import { MAGIC_BENTOBOX_APR_DECIMALS } from './sushiswap/sushiswap.constants';
import {
  ISushiSwapChef,
  ISushiSwapERC20Token,
  ISushiSwapLiquidityPair,
  ISushiSwapPoolUser,
  ISushiSwapSubgraphToken,
} from './sushiswap/sushiswap.interfaces';

@Injectable()
export class SushiSwapProtocolV2 extends BasicProtocol {
  readonly chains = [
    ChainAbbrEnum.arbi,
    ChainAbbrEnum.avax,
    ChainAbbrEnum.bsc,
    ChainAbbrEnum.celo,
    ChainAbbrEnum.eth,
    ChainAbbrEnum.ftm,
    ChainAbbrEnum.harm,
    // ChainAbbrEnum.heco, // TODO: find out why heco subgraph is returning 404
    ChainAbbrEnum.mriver, // TODO
    // ChainAbbrEnum.okex,
    ChainAbbrEnum.plg,
    ChainAbbrEnum.xdai,
  ];
  readonly project = ProjectEnum.sushiswap;
  readonly name = SushiSwapProtocolEnum.sushiswapV2;
  readonly displayName = 'SushiSwap';
  readonly features = {
    [ChainAbbrEnum.arbi]: [
      FeatureEnum.pools,
      FeatureEnum.staking,
      FeatureEnum.lending,
      FeatureEnum.collateral,
      FeatureEnum.borrowing,
      // FeatureEnum.health,
    ],
    [ChainAbbrEnum.avax]: [
      FeatureEnum.pools,
      // FeatureEnum.lending, // no subgraph
      // FeatureEnum.collateral, // no subgraph
      // FeatureEnum.borrowing, // no subgraph
      // FeatureEnum.health, // no subgraph
    ],
    [ChainAbbrEnum.bsc]: [
      FeatureEnum.pools,
      FeatureEnum.lending,
      FeatureEnum.collateral,
      FeatureEnum.borrowing,
      // FeatureEnum.health,
    ],
    [ChainAbbrEnum.celo]: [
      FeatureEnum.pools, //
      FeatureEnum.staking,
    ],
    [ChainAbbrEnum.eth]: [
      FeatureEnum.pools,
      FeatureEnum.staking,
      FeatureEnum.lending,
      FeatureEnum.collateral,
      FeatureEnum.borrowing,
      // FeatureEnum.health // TODO
    ],
    [ChainAbbrEnum.ftm]: [
      FeatureEnum.pools, //
    ],
    [ChainAbbrEnum.harm]: [
      FeatureEnum.pools, //
      FeatureEnum.staking,
    ],
    [ChainAbbrEnum.plg]: [
      FeatureEnum.pools,
      FeatureEnum.staking,
      FeatureEnum.lending,
      FeatureEnum.collateral,
      FeatureEnum.borrowing,
      // FeatureEnum.health,
    ],
    [ChainAbbrEnum.xdai]: [
      FeatureEnum.pools,
      FeatureEnum.staking,
      FeatureEnum.lending,
      FeatureEnum.collateral,
      FeatureEnum.borrowing,
      // FeatureEnum.health,
    ],
    // [ChainAbbrEnum.heco]: [FeatureEnum.pools], // app.sushi.com makes calls to 'undefined'
    [ChainAbbrEnum.mriver]: [
      FeatureEnum.pools, //
      FeatureEnum.staking,
    ],
    // [ChainAbbrEnum.okex]: [FeatureEnum.pools], // app.sushi.com gets 401 error from https://graph.kkt.one/node/subgraphs/name/sushiswap/okex-exchange
  };

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly exchangeSubgraph: SushiSwapExchangeSubgraph,
    protected readonly masterChefSubgraph: SushiSwapMasterChefSubgraph,
    protected readonly miniChefSubgraph: SushiSwapMiniChefSubgraph,
    protected readonly sushiBarSubgraph: SushiSwapSushiBarSubgraph,
    protected readonly bentoBoxSubgraph: SushiSwapBentoBoxSubgraph,
    private readonly multicallService: MulticallAggregator,
  ) {
    super();
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const baseData: BaseData[] = [];
    const errors: string[] = [];
    try {
      for (const address of addresses) {
        const addressData = await this.getAllFeaturesData(address, chain);
        if (addressData[FeatureEnum.pools]) {
          const basePoolsInfo: BaseDataLp = plainToClass(BaseDataLp, {
            chain,
            projectName: ProjectEnum.sushiswap,
            protocolName: ProtocolNameEnum.sushiswapV2,
            userAddress: address,
            feature: FeatureEnum.pools,
            items: addressData[FeatureEnum.pools].items,
          });

          baseData.push(basePoolsInfo);
        }

        if (addressData[FeatureEnum.staking]) {
          const baseStakingInfo: BaseDataStaking = plainToClass(BaseDataStaking, {
            chain,
            projectName: ProjectEnum.sushiswap,
            protocolName: ProtocolNameEnum.sushiswapV2,
            userAddress: address,
            feature: FeatureEnum.staking,
            items: addressData[FeatureEnum.staking].items,
          });

          baseData.push(baseStakingInfo);
        }

        if (addressData[FeatureEnum.lending]) {
          const baseLendingInfo: BaseDataLending = plainToClass(BaseDataLending, {
            chain,
            projectName: ProjectEnum.sushiswap,
            protocolName: ProtocolNameEnum.sushiswapV2,
            userAddress: address,
            protocolType: ProtocolTypeEnum.lending,
            feature: FeatureEnum.lending,
            items: addressData[FeatureEnum.lending].items,
          });

          baseData.push(baseLendingInfo);
        }

        if (addressData[FeatureEnum.borrowing]) {
          const baseBorrowingInfo: BaseDataLending = plainToClass(BaseDataLending, {
            chain,
            projectName: ProjectEnum.sushiswap,
            protocolName: ProtocolNameEnum.sushiswapV2,
            userAddress: address,
            protocolType: ProtocolTypeEnum.lending,
            feature: FeatureEnum.borrowing,
            items: addressData[FeatureEnum.borrowing].items,
          });

          baseData.push(baseBorrowingInfo);
        }

        if (addressData[FeatureEnum.collateral]) {
          const baseBorrowingInfo: BaseDataLending = plainToClass(BaseDataLending, {
            chain,
            projectName: ProjectEnum.sushiswap,
            protocolName: ProtocolNameEnum.sushiswapV2,
            userAddress: address,
            protocolType: ProtocolTypeEnum.lending,
            feature: FeatureEnum.collateral,
            items: addressData[FeatureEnum.collateral].items,
          });

          baseData.push(baseBorrowingInfo);
        }
      }
    } catch (e) {
      errors.push(e.message);
    }

    return [baseData, errors];
  }

  async getAllFeaturesData(address: string, chain: ChainDto): Promise<IntegrationFeaturesDataDto> {
    const response = this.initializeResponseForChain(chain);

    // mutate response per feature of current chain
    // when all promises have resolved, its done.
    const responsePromises = [];

    if (response[FeatureEnum.pools]) {
      responsePromises.push(this[FeatureEnum.pools](response, address, chain));
    }

    if (response[FeatureEnum.staking]) {
      responsePromises.push(this[FeatureEnum.staking](response, address, chain));
    }

    if (
      response[FeatureEnum.lending] ||
      response[FeatureEnum.borrowing] ||
      response[FeatureEnum.collateral]
    ) {
      // Lending and borrowing responses are returned from the same subgraph call
      // this will add both to the response instead of making the same request twice
      responsePromises.push(this[FeatureEnum.lending](response, address, chain));
    }

    // wait for all features to be complete
    await Promise.all(responsePromises);

    // return the mutated response
    return response;
  }

  initializeResponseForChain(chain: ChainDto): IntegrationFeaturesDataDto {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    this.features[chain.abbr].forEach((feature: FeatureEnum) => {
      response[feature] = {
        totalValue: 0,
        items: [],
      };
    });

    return response;
  }

  async [FeatureEnum.pools](
    response: IntegrationFeaturesDataDto,
    address: Address,
    chain: ChainDto,
  ): Promise<void> {
    const users = await this.exchangeSubgraph.getLiquidityPositions(
      address.toLowerCase().split(','),
      chain,
    );

    const underlyingTokenAddresses = users.flatMap((user) =>
      user.liquidityPositions.flatMap((position) => [
        position.pair.token0.id,
        position.pair.token1.id,
      ]),
    );

    const { prices } = await this.priceService.getTokenPricesFetch(
      underlyingTokenAddresses,
      chain.id,
    );

    await Promise.all(
      users.flatMap((user) =>
        user.liquidityPositions.flatMap(async (position) => {
          for (const token of [position.pair.token0, position.pair.token1]) {
            if (!prices[token.id]) {
              this.logger.warn(
                `Failed to fetch price for token ${token.name} (${token.symbol}) - ${token.id} on chain ${chain.id}. Perhaps consider tracking it.`,
              );
              return;
            }
          }

          const userPoolShare = this.getPoolShare(
            position.liquidityTokenBalance,
            position.pair.totalSupply,
          );

          const { reserve0USD, reserve1USD, TVL } = this.getReserveUSDTotals(position.pair, prices);

          const userData = {
            value: Number(new BigNumber(userPoolShare).multipliedBy(TVL)),
            share: Number(userPoolShare),
          };

          response[FeatureEnum.pools].totalValue += userData.value;

          const staking = plainToClass(LiquidityPoolFeatureDto, {
            address: position.pair.id,
            name: `${position.pair.token0.symbol}/${position.pair.token1.symbol}`,
            lpToken: plainToClass(ERC20TokenDto, {
              address: position.pair.id,
              name: 'SushiSwap LP Token',
              symbol: 'SLP',
              decimals: 18,
              isLp: true,
              totalSupply: position.pair.totalSupply,
            }),
            TVL: Number(TVL),
            user: userData,
            tokens: [
              this.formatPoolToken(
                position.pair.token0,
                position.pair.reserve0,
                userPoolShare,
                reserve0USD,
                prices,
              ),
              this.formatPoolToken(
                position.pair.token1,
                position.pair.reserve1,
                userPoolShare,
                reserve1USD,
                prices,
              ),
            ],
          });

          response[FeatureEnum.pools].items.push(staking);
        }),
      ),
    );
  }

  async [FeatureEnum.staking](
    response: IntegrationFeaturesDataDto,
    address: Address,
    chain: ChainDto,
  ): Promise<void> {
    const stakingFeature = await this.getChainSpecificStakingData(address, chain);
    response[FeatureEnum.staking].totalValue += stakingFeature.totalValue;
    response[FeatureEnum.staking].items.push(...stakingFeature.items);
  }

  async [FeatureEnum.lending](
    response: IntegrationFeaturesDataDto,
    address: Address,
    chain: ChainDto,
  ): Promise<void> {
    // TODO: 'tokens' returned from here are displayed as 'Deposited' on debank
    const users = await this.bentoBoxSubgraph.getLendingPositions(
      address.toLowerCase().split(','),
      chain,
    );

    const underlyingTokenAddresses = users.flatMap((user) =>
      [].concat(
        user.kashiPairs.flatMap((kashiPair) => [
          kashiPair.pair.asset.id,
          kashiPair.pair.collateral.id,
        ]),
        user.tokens.flatMap((token) => token.token.id),
      ),
    );
    const { prices } = await this.priceService.getTokenPricesFetch(
      underlyingTokenAddresses,
      chain.id,
    );

    users.flatMap((user) => {
      user.kashiPairs.flatMap((kashiPair) => {
        const lendingPosition = this.formatLendingPosition(
          kashiPair.assetFraction,
          kashiPair.pair.asset,
          prices,
          kashiPair.pair.supplyAPR,
        );

        const collateralPosition = this.formatLendingPosition(
          kashiPair.collateralShare,
          kashiPair.pair.collateral,
          prices,
        );

        const borrowingPosition = this.formatLendingPosition(
          kashiPair.borrowPart,
          kashiPair.pair.asset,
          prices,
          kashiPair.pair.borrowAPR,
        );

        response[FeatureEnum.lending].items.push(lendingPosition);
        response[FeatureEnum.collateral].items.push(collateralPosition);
        response[FeatureEnum.borrowing].items.push(borrowingPosition);

        response[FeatureEnum.lending].totalValue += lendingPosition.value;
        response[FeatureEnum.collateral].totalValue += collateralPosition.value;
        response[FeatureEnum.borrowing].totalValue += borrowingPosition.value;
      });
    });

    // "Deposits"
    users.flatMap((user) => {
      user.tokens.forEach((token) => {
        const balance = normalizeDecimals(token.share, token.token.decimals);
        const price = prices[token.token.id];
        const stakedToken = plainToClass(LPToken, {
          address: token.token.id,
          name: token.token.name,
          symbol: token.token.symbol,
          decimals: token.token.decimals,
          balance,
          value: price * balance,
          price,
        });

        const position = plainToClass(IntegrationStakingPositionDto, {
          address: null,
          poolId: null,
          poolName: token.token.symbol,
          staked: balance,
          rewards: [],
          stakingToken: stakedToken,
        });

        response[FeatureEnum.staking].items.push(position);
        response[FeatureEnum.staking].totalValue += position.stakingToken.value;
      });
    });
  }

  formatLendingPosition(
    share: string,
    token: ISushiSwapERC20Token,
    prices: CurrentPricesPayload,
    apr = '0',
  ): LendingPositionDto {
    const collateralBalance = normalizeDecimals(share, token.decimals);

    const collateralPrice = Number(prices[token.id]);
    return plainToClass(LendingPositionDto, {
      address: token.id,
      balance: collateralBalance,
      value: collateralBalance * collateralPrice,
      apy: normalizeDecimals(apr, MAGIC_BENTOBOX_APR_DECIMALS),
      token: this.formatLendToken(token, collateralPrice),
    });
  }

  formatLendToken(token: ISushiSwapERC20Token, price: number): LendingErcToken {
    return plainToClass(LendingErcToken, {
      address: token.id,
      decimals: token.decimals,
      name: token.name,
      symbol: token.symbol,
      price,
    });
  }

  getChainSpecificStakingData(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    switch (chain.id) {
      case ChainIdEnum.eth:
        return this.getEthStaking(address, chain);
      default:
        return this.getMiniChefSubgraphStaking(address, chain);
    }
  }

  /**
   * Polygon Staking Helpers
   */
  async getMiniChefSubgraphStaking(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    const { users, miniChef } = await this.miniChefSubgraph.getMiniChefPositions(
      address.toLowerCase().split(','),
      chain,
    );

    try {
      return await this.getGenericMasterChef(address, chain, users, miniChef);
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Chain: ${chain.id} - Failed to get minichef data`);
    }
  }

  /**
   * Eth Staking Helpers
   */
  async getEthStaking(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    const stakingFeature = {
      totalValue: 0,
      items: [],
    };

    const [masterChef, sushiBar] = await Promise.all([
      this.getEthMasterChef(address, chain),
      this.getEthSushiBar(address, chain),
    ]);

    stakingFeature.totalValue += masterChef.totalValue;
    stakingFeature.totalValue += sushiBar.totalValue;

    stakingFeature.items.push(...masterChef.items, ...sushiBar.items);

    return stakingFeature;
  }

  async getEthSushiBar(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    const { users, bar } = await this.sushiBarSubgraph.getSushiBarPositions(
      address.toLowerCase().split(','),
      chain,
    );

    const { prices } = await this.priceService.getTokenPricesFetch([bar.sushi], chain.id);

    let totalValue = 0;
    const items = users.map((user) => {
      const price = Number(bar.ratio) * prices[bar.sushi];

      const stakedToken = plainToClass(LPToken, {
        address: bar.id,
        name: bar.name,
        symbol: bar.symbol,
        decimals: bar.decimals,
        totalSupply: bar.totalSupply,
        balance: user.xSushi,
        value: price * Number(user.xSushi),
        price,
      });

      totalValue += stakedToken.value;

      return plainToClass(IntegrationStakingPositionDto, {
        address: bar.id,
        poolName: bar.name,
        staked: user.xSushi,
        stakingToken: stakedToken,
      });
    });

    return { totalValue, items };
  }

  async getEthMasterChef(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    const { users, masterChef } = await this.masterChefSubgraph.getMasterChefPositions(
      address.toLowerCase().split(','),
      chain,
    );

    try {
      return this.getGenericMasterChef(address, chain, users, masterChef);
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Chain: ${chain.id} - Failed to get masterchef data`);
    }
  }

  /**
   * Generic Helpers
   */
  async getGenericMasterChef(
    address: Address,
    chain: ChainDto,
    users: ISushiSwapPoolUser[],
    masterChef: ISushiSwapChef,
  ) {
    if (!users.length) {
      return { items: [], totalValue: 0 };
    }
    const {
      data: [sushi],
    } = await this.accountService.getAssets([masterChef.sushi], [chain.id]);

    const pairAddresses = users.flatMap((user: any) => user.pool.pair);
    const pairsData = await this.exchangeSubgraph.getPairs(pairAddresses, chain);
    const pairs = new Map<string, ISushiSwapLiquidityPair>(
      pairsData.map((pair) => [pair.id, pair]),
    );

    const underlyingTokenAddresses = pairsData.flatMap((pair) => [pair.token0.id, pair.token1.id]);
    const { prices } = await this.priceService.getTokenPricesFetch(
      underlyingTokenAddresses.concat(masterChef.sushi),
      chain.id,
    );

    const pendingSushi = await this.getPendingSushi(users, masterChef, address, chain);

    let totalValue = 0;
    const items = users.flatMap((user) => {
      const pair = pairs.get(user.pool.pair);

      const userBalance = (Number(user.amount) / 1e18).toString();

      const userPoolShare = this.getPoolShare(userBalance, pair.totalSupply);

      const { reserve0USD, reserve1USD, TVL } = this.getReserveUSDTotals(pair, prices);
      const stakedPrice = new BigNumber(TVL).dividedBy(pair.totalSupply);
      const userValue = stakedPrice.multipliedBy(userBalance);

      const stakedToken = plainToClass(LPToken, {
        address: pair.id,
        name: 'SushiSwap LP Token',
        symbol: 'SLP',
        decimals: 18,
        totalSupply: pair.totalSupply,
        balance: userBalance,
        value: userValue,
        price: stakedPrice,
        tokens: [
          this.formatPoolToken(pair.token0, pair.reserve0, userPoolShare, reserve0USD, prices),
          this.formatPoolToken(pair.token1, pair.reserve1, userPoolShare, reserve1USD, prices),
        ],
      });

      const rewardBalance = pendingSushi.get(user.pool.id)
        ? new BigNumber(pendingSushi.get(user.pool.id))
            .dividedBy(new BigNumber(10).pow(sushi.decimals))
            .toString()
        : null;

      const rewardValue = Number(rewardBalance) * prices[masterChef.sushi];

      const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
        price: prices[masterChef.sushi],
        symbol: sushi.symbol,
        name: sushi.name,
        address: sushi.address,
        decimals: sushi.decimals,
        claimableData: plainToClass(ClaimableDto, {
          balance: rewardBalance,
          value: rewardValue,
        }),
      });

      totalValue += Number(userValue);
      totalValue += Number(rewardValue);

      return plainToClass(IntegrationStakingPositionDto, {
        address: masterChef.id,
        poolId: user.pool.id,
        poolName: `${pair.token0.symbol}/${pair.token1.symbol}`,
        staked: user.amount,
        rewards: [rewardToken],
        stakingToken: stakedToken,
      });
    });

    return { items, totalValue };
  }

  async getPendingSushi(
    users: ISushiSwapPoolUser[],
    masterChef: ISushiSwapChef,
    address: Address,
    chain: ChainDto,
  ) {
    const poolIds = users.flatMap((user) => user.pool.id);
    const masterChefContract = new SushiSwapMasterChefAbi(masterChef.id);

    // Build a call per pool
    const calls = poolIds.reduce((calls, poolId) => {
      return calls.set(`${poolId}-${address}`, masterChefContract.pendingSushi(poolId, address));
    }, new Map());

    // Make the multicall
    const results = await this.multicallService.handleInBatches(calls, chain.id);

    // Format the data to get the returned values
    const pendingSushiMap = Array.from(results.values()).reduce((calls, result) => {
      const [poolId] = result.input.data;
      return calls.set(poolId, result.output.data.toString());
    }, new Map());

    return pendingSushiMap;
  }

  getReserveUSDTotals(pair: ISushiSwapLiquidityPair, prices: CurrentPricesPayload) {
    const reserve0USD = this.getPairReserve(pair.reserve0, prices[pair.token0.id]);

    const reserve1USD = this.getPairReserve(pair.reserve1, prices[pair.token1.id]);

    const TVL = new BigNumber(reserve1USD) //
      .plus(reserve0USD)
      .toString();

    return { reserve0USD, reserve1USD, TVL };
  }

  getPoolShare(balance: string, totalSupply: string): string {
    return new BigNumber(balance) //
      .dividedBy(totalSupply)
      .toString();
  }

  getPairReserve(reserve: string, price: string | number): string {
    return new BigNumber(reserve) //
      .multipliedBy(price)
      .toString();
  }

  formatPoolToken(
    token: ISushiSwapSubgraphToken,
    reserve: string,
    userPoolShare: string,
    reserveUSD: string,
    prices: CurrentPricesPayload,
  ): PoolTokenDto {
    const value = Number(userPoolShare) * Number(reserveUSD);

    return plainToClass(PoolTokenDto, {
      address: token.id,
      name: token.name,
      symbol: token.symbol,
      reserve: reserve,
      decimals: Number(token.decimals),
      value: value.toString(),
      balance: value / prices[token.id],
      price: Number(prices[token.id]),
    });
  }
}

export default SushiSwapProtocolV2;
