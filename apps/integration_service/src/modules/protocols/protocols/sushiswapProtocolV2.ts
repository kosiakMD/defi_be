import { toDecimals } from 'apps/integration_service/src/common/utils/util';
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ChainIdEnum,
  ClaimableDto,
  ERC20TokenDto,
  FeatureEnum,
  FeatureResultDto,
  IntegrationClaimableTokenDto,
  IntegrationFeaturesDataDto,
  LendingErcToken,
  LendingPositionDto,
  Logger,
  PoolTokenDto,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
  SushiSwapProtocolEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { LiquidityPoolFeature } from '@app/common/jobs/pools';
import { normalizeDecimals } from '@app/common/utils/number';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { IntegrationStakingPositionDto, LPToken } from '../../../common/dto';
import { Asset } from '../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { SushiSwapBentoBoxSubgraph } from '../../subgraphs/subgraphs/sushiswap.bentobox.subgraph';
import { SushiSwapExchangeSubgraph } from '../../subgraphs/subgraphs/sushiswap.exchange.subgraph';
import { SushiSwapMasterChefSubgraph } from '../../subgraphs/subgraphs/sushiswap.masterchef.subgraph';
import { SushiSwapMasterChefV2Subgraph } from '../../subgraphs/subgraphs/sushiswap.masterchef.v2.subgraph';
import { SushiSwapMiniChefSubgraph } from '../../subgraphs/subgraphs/sushiswap.minichef.subgraph';
import { SushiSwapSushiBarSubgraph } from '../../subgraphs/subgraphs/sushiswap.sushibar.subgraph';
import BasicProtocol from './basicProtocol';
import { SushiSwapRewarder } from './sushiswap/contracts/rewarder';
import { SushiSwapMasterChefAbi } from './sushiswap/contracts/sushiswap.masterchef';
import { MAGIC_BENTOBOX_APR_DECIMALS, SUSHI_ADDRESS } from './sushiswap/sushiswap.constants';
import {
  ISushiSwapChef,
  ISushiSwapERC20Token,
  ISushiSwapLiquidityPair,
  ISushiSwapPoolUser,
  ISushiSwapPoolUserV2,
  ISushiSwapSubgraphToken,
} from './sushiswap/sushiswap.interfaces';

@Injectable()
export class SushiSwapProtocolV2 extends BasicProtocol {
  readonly chains = [
    ChainAbbrEnum.arbi,
    ChainAbbrEnum.avax,
    ChainAbbrEnum.bnb,
    ChainAbbrEnum.celo,
    ChainAbbrEnum.eth,
    ChainAbbrEnum.ftm,
    ChainAbbrEnum.harm,
    // ChainAbbrEnum.heco, // TODO: find out why heco subgraph is returning 404
    ChainAbbrEnum.mriver, // TODO
    // ChainAbbrEnum.okex,
    ChainAbbrEnum.plg,
    ChainAbbrEnum.gnosis,
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
    [ChainAbbrEnum.bnb]: [
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
    [ChainAbbrEnum.gnosis]: [
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
    protected readonly masterChefV2Subgraph: SushiSwapMasterChefV2Subgraph,
    protected readonly miniChefSubgraph: SushiSwapMiniChefSubgraph,
    protected readonly sushiBarSubgraph: SushiSwapSushiBarSubgraph,
    protected readonly bentoBoxSubgraph: SushiSwapBentoBoxSubgraph,
    private readonly multicallService: MulticallAggregator,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  // V2 Controller
  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const baseData: BaseData[] = [];
    const errors: string[] = [];
    try {
      for (const address of addresses) {
        // Get V1 data and reformat for V2
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

        if (addressData.errors) {
          errors.push(...addressData.errors);
        }
      }
    } catch (e) {
      errors.push(e.message);
    }

    return [baseData, errors];
  }

  // V1 Controller
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

  async PoolsBscChain(
    response: IntegrationFeaturesDataDto,
    address: Address,
    chain: ChainDto,
  ): Promise<void> {
    const API = `${this.configService.get(
      'COVALENT_URL',
    )}/56/address/${address}/stacks/sushiswap/balances/?quote-currency=USD&format=JSON&key=${this.configService.get(
      'COVALENT_KEY',
    )}`;

    const responseList = await firstValueFrom(this.httpService.get(API));
    const list = responseList.data.data.sushiswap.balances;
    const underlyingTokenAddresses = list.flatMap((p) => [
      p.token_0.contract_address,
      p.token_1.contract_address,
    ]);

    const mappedListPoolInfo = list.map((l) => {
      return {
        poolToken: {
          balance: `${toDecimals(l.pool_token.balance, l.pool_token.contract_decimals)}`,
          totalSupply: `${toDecimals(l.pool_token.total_supply, l.pool_token.contract_decimals)}`,
        },
        pair: {
          token0: {
            id: l.token_0.contract_address,
            symbol: l.token_0.contract_ticker_symbol,
            decimals: l.token_0.contract_decimals,
            balance: `${toDecimals(l.token_0.balance, l.token_0.contract_decimals)}`,
          },
          token1: {
            id: l.token_1.contract_address,
            symbol: l.token_1.contract_ticker_symbol,
            decimals: l.token_1.contract_decimals,
            balance: `${toDecimals(l.token_1.balance, l.token_1.contract_decimals)}`,
          },
        },
      };
    });

    const prices = await this.getPrices(underlyingTokenAddresses, chain);

    await Promise.all(
      mappedListPoolInfo.flatMap(async (position) => {
        for (const token of [position.pair.token0, position.pair.token1]) {
          if (!prices.has(token.id)) {
            this.logger.warn(
              `Failed to fetch price for token ${token.name} (${token.symbol}) - ${token.id} on chain ${chain.id}. Perhaps consider tracking it.`,
            );
            return;
          }
        }

        const userPoolShare = this.getPoolShare(
          position.poolToken.balance,
          position.poolToken.totalSupply,
        );

        const poolFeature = plainToClass(LiquidityPoolFeature, {
          address: position.poolToken.contract_address,
          name: `${position.pair.token0.symbol}/${position.pair.token1.symbol}`,
          lpToken: plainToClass(ERC20TokenDto, {
            address: position.poolToken.contract_address,
            name: 'SushiSwap LP Token',
            symbol: 'SLP',
            decimals: 18,
            isLp: true,
            totalSupply: position.poolToken.totalSupply,
          }),
          stats: {
            feeRate: null,
            tvl: null,
            share: Number(userPoolShare),
          },
          tokens: [
            this.formatPoolTokenBSCTmp(position.pair.token0, prices),
            this.formatPoolTokenBSCTmp(position.pair.token1, prices),
          ],
        });

        response[FeatureEnum.pools].items.push(poolFeature);
      }),
    );
  }

  async PoolsOtherChains(
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

    const prices = await this.getPrices(underlyingTokenAddresses, chain);

    await Promise.all(
      users.flatMap((user) =>
        user.liquidityPositions.flatMap(async (position) => {
          for (const token of [position.pair.token0, position.pair.token1]) {
            if (!prices.has(token.id)) {
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

          const poolFeature = plainToClass(LiquidityPoolFeature, {
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
            stats: {
              feeRate: null,
              tvl: Number(TVL),
              share: Number(userPoolShare),
            },
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

          response[FeatureEnum.pools].items.push(poolFeature);
        }),
      ),
    );
  }

  async [FeatureEnum.pools](
    response: IntegrationFeaturesDataDto,
    address: Address,
    chain: ChainDto,
  ): Promise<void> {
    if (chain.id === 2) {
      await this.PoolsBscChain(response, address, chain);
    } else {
      await this.PoolsOtherChains(response, address, chain);
    }
  }

  async [FeatureEnum.staking](
    response: IntegrationFeaturesDataDto,
    address: Address,
    chain: ChainDto,
  ): Promise<void> {
    const [stakingFeature, errors] = await this.getChainSpecificStakingData(address, chain);
    response.errors.push(...errors);
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
    const prices = await this.getPrices(underlyingTokenAddresses, chain);

    users.forEach((user) => {
      user.kashiPairs.forEach((kashiPair) => {
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

        if (Number(kashiPair.assetFraction)) {
          response[FeatureEnum.lending].items.push(lendingPosition);
          response[FeatureEnum.lending].totalValue += lendingPosition.value;
        }

        if (Number(kashiPair.collateralShare)) {
          response[FeatureEnum.collateral].items.push(collateralPosition);
          response[FeatureEnum.collateral].totalValue += collateralPosition.value;
        }
        if (Number(kashiPair.borrowPart)) {
          response[FeatureEnum.borrowing].items.push(borrowingPosition);
          response[FeatureEnum.borrowing].totalValue += borrowingPosition.value;
        }
      });
    });

    // "Deposits"
    // TODO: I can't find the interface for these deposits, however they show up in debank & on the subgraph
    // BSC has no deposits available, however tokens are returned from the subgraph
    // (Also TVL is _very) low, so not a big issue I don't think)
    if (response[FeatureEnum.staking]) {
      users.flatMap((user) => {
        user.tokens.forEach((token) => {
          const balance = normalizeDecimals(token.share, token.token.decimals);
          const price = prices.get(token.token.id);
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
  }

  formatLendingPosition(
    share: string,
    token: ISushiSwapERC20Token,
    prices: Map<Address, number>,
    apr = '0',
  ): LendingPositionDto {
    const collateralBalance = normalizeDecimals(share, token.decimals);

    const price = prices.get(token.id);

    return plainToClass(LendingPositionDto, {
      address: token.id,
      balance: collateralBalance,
      value: collateralBalance * price,
      apy: normalizeDecimals(apr, MAGIC_BENTOBOX_APR_DECIMALS),
      token: this.formatLendToken(token, price),
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
  ): Promise<[FeatureResultDto<IntegrationStakingPositionDto>, string[]]> {
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
  ): Promise<[FeatureResultDto<IntegrationStakingPositionDto>, string[]]> {
    try {
      const { users, masterChef } = await this.miniChefSubgraph.getMiniChefPositions(
        address.toLowerCase().split(','),
        chain,
      );

      const staking = await this.getGenericMasterChef(address, chain, users, masterChef);
      return [staking, []];
    } catch (e) {
      this.logger.error(e);
      return [
        {
          totalValue: 0,
          items: [],
        },
        [`Chain: ${chain.id} - Failed to get minichef data - ${e}`],
      ];
    }
  }

  /**
   * Eth Staking Helpers
   */
  async getEthStaking(
    address: Address,
    chain: ChainDto,
  ): Promise<[FeatureResultDto<IntegrationStakingPositionDto>, string[]]> {
    const errors = [];
    const stakingFeature = {
      totalValue: 0,
      items: [],
    };

    const stakingDataResults = await Promise.allSettled([
      this.getMasterChef(address, chain),
      this.getMasterChefV2(address, chain),
      this.getSushiBar(address, chain),
    ]);

    const accepted =
      stakingDataResults
        ?.filter(
          (a): a is PromiseFulfilledResult<FeatureResultDto<IntegrationStakingPositionDto>> =>
            a.status === 'fulfilled',
        )
        .map((a) => a.value) || [];

    const denied =
      stakingDataResults
        ?.filter((a): a is PromiseRejectedResult => a.status !== 'fulfilled')
        .map((a) => a.reason) || [];

    accepted.forEach((result) => {
      stakingFeature.totalValue += result.totalValue;
      stakingFeature.items.push(...result.items);
    });

    denied.forEach((reason) => {
      this.logger.error(reason);
      errors.push(reason.message);
    });

    return [stakingFeature, errors];
  }

  async getSushiBar(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    const { users, bar } = await this.sushiBarSubgraph.getSushiBarPositions(
      address.toLowerCase().split(','),
      chain,
    );

    const { prices } = await this.priceService.getTokenPricesFetch(
      [SUSHI_ADDRESS.get(chain.id)],
      chain.id,
    );

    let totalValue = 0;
    const items =
      users?.map((user) => {
        const price = Number(bar.ratio) * prices[SUSHI_ADDRESS.get(chain.id)];

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
      }) || [];

    return { totalValue, items };
  }

  async getMasterChef(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    try {
      const { users, masterChef } = await this.masterChefSubgraph.getMasterChefPositions(
        address.toLowerCase().split(','),
        chain,
      );

      return this.getGenericMasterChef(address, chain, users, masterChef);
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Chain: ${chain.id} - Failed to get masterchef data`);
    }
  }

  async getMasterChefV2(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    try {
      const { users, masterChef } = await this.masterChefV2Subgraph.getMasterChefPositions(
        address.toLowerCase().split(','),
        chain,
      );

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
    users: ISushiSwapPoolUser[] | ISushiSwapPoolUserV2[],
    masterChef: ISushiSwapChef,
  ) {
    if (!users.length) {
      return { items: [], totalValue: 0 };
    }
    const pairAddresses = users.flatMap((user: any) => user.pool.pair);
    const pairsData = await this.exchangeSubgraph.getPairs(pairAddresses, chain);
    const pairs = new Map<string, ISushiSwapLiquidityPair>(
      pairsData?.map((pair) => [pair.id, pair]) || [],
    );

    const underlyingTokenAddresses = pairsData.flatMap((pair) => [pair.token0.id, pair.token1.id]);

    const [pendingSushi, pendingRewards] = await Promise.all([
      this.getPendingSushi(users, masterChef, address, chain),
      this.getPendingRewards(users, address, masterChef, chain),
    ]);

    const rewardTokens = Array.from(pendingRewards.values())
      .flatMap((pools) => pools.flatMap((pool) => pool.address))
      .concat(SUSHI_ADDRESS.get(chain.id));

    const [assets, prices] = await Promise.all([
      this.getAssets(rewardTokens, chain),
      this.getPrices(underlyingTokenAddresses.concat(rewardTokens), chain),
    ]);

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

      const sushi = assets.get(SUSHI_ADDRESS.get(chain.id));
      const sushiPrice = prices.get(SUSHI_ADDRESS.get(chain.id));
      const rewardBalance = pendingSushi.get(`${user.pool.id}-${address}`)
        ? new BigNumber(pendingSushi.get(`${user.pool.id}-${address}`))
            .dividedBy(new BigNumber(10).pow(sushi.decimals))
            .toString()
        : null;

      const rewards = rewardBalance
        ? [
            plainToClass(IntegrationClaimableTokenDto, {
              price: sushiPrice,
              symbol: sushi.symbol,
              name: sushi.name,
              address: sushi.address,
              decimals: sushi.decimals,
              claimableData: plainToClass(ClaimableDto, {
                balance: rewardBalance,
                value: Number(rewardBalance) * sushiPrice,
              }),
            }),
          ]
        : [];

      // Each rewarder has an array of additional rewards (optional, only available in masterchef v2)
      pendingRewards.get(`${user.pool.id}-${address}`)?.forEach(({ amount, address }) => {
        const token = assets.get(address);
        const price = prices.get(address);
        const balance = normalizeDecimals(amount, token.decimals);
        rewards.push(
          plainToClass(IntegrationClaimableTokenDto, {
            price,
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            decimals: token.decimals,
            claimableData: plainToClass(ClaimableDto, {
              balance,
              value: balance * price,
            }),
          }),
        );
      });

      // Tally the farm & reward balance
      totalValue += rewards.reduce((acc, cur) => acc + cur.claimableData.value, Number(userValue));

      return plainToClass(IntegrationStakingPositionDto, {
        address: masterChef.id,
        poolId: user.pool.id,
        poolName: `${pair.token0.symbol}/${pair.token1.symbol}`,
        staked: user.amount,
        rewards: rewards,
        stakingToken: stakedToken,
      });
    });

    return { items, totalValue };
  }

  async getPendingRewards(
    users: ISushiSwapPoolUser[] | ISushiSwapPoolUserV2[],
    address: Address,
    masterChef: ISushiSwapChef,
    chain: ChainDto,
  ) {
    try {
      const pools = users.flatMap((user) => user.pool);
      const contract = new SushiSwapMasterChefAbi(masterChef.id);
      const rewarderCalls = new Map();
      pools?.forEach((pool) =>
        rewarderCalls.set(`rewarder_${pool.id}`, contract.rewarder(pool.id)),
      );
      const rewarderResults = await this.multicallService.handleInBatches(rewarderCalls, chain.id);

      const calls = new Map();
      pools?.forEach((pool) => {
        const rewarderAddress = rewarderResults.get(`rewarder_${pool.id}`).output.data.toString();
        const rewarderContract = new SushiSwapRewarder(rewarderAddress);

        calls.set(
          `${pool.id}-${rewarderAddress}-${address}`,
          rewarderContract.pendingTokens(pool.id, address, 0), // ? I think the last argument doesn't do anything? e.g. 0x7519C93fC5073E15d89131fD38118D73A72370F8
        );
      });

      const rawResults = await this.multicallService.handleInBatches(calls, chain.id);
      return Array.from(rawResults.values()).reduce((calls, result) => {
        const [poolId, user] = result.input.data;
        const { rewardTokens, rewardAmounts } = result.output.data;

        return calls.set(
          `${poolId}-${user}`,
          rewardTokens?.map((token, idx) => {
            return {
              address: token.toLowerCase(),
              amount: rewardAmounts[idx].toString(),
            };
          }) || [],
        );
      }, new Map());
    } catch {
      // Silently fail as many contracts don't support this feature
      return new Map();
    }
  }

  async getPendingSushi(
    users: ISushiSwapPoolUser[],
    masterChef: ISushiSwapChef,
    address: Address,
    chain: ChainDto,
  ) {
    try {
      const poolIds = users.flatMap((user) => user.pool.id);
      const masterChefContract = new SushiSwapMasterChefAbi(masterChef.id);

      // Build a call per pool
      const calls = poolIds.reduce((calls, poolId) => {
        return calls.set(`${poolId}-${address}`, masterChefContract.pendingSushi(poolId, address));
      }, new Map());

      // Make the multicall
      const results = await this.multicallService.handleInBatches(calls, chain.id);

      // Format the data to get the returned values
      return Array.from(results.values()).reduce((calls, result) => {
        const [poolId] = result.input.data;
        return calls.set(`${poolId}-${address}`, result.output.data.toString());
      }, new Map());
    } catch {
      this.logger.error(`Failed to get Sushiswap pendingSushi for chain ${chain.id}`);
      return new Map();
    }
  }

  getReserveUSDTotals(pair: ISushiSwapLiquidityPair, prices: Map<Address, number>) {
    const reserve0USD = this.getPairReserve(pair.reserve0, prices.get(pair.token0.id));

    const reserve1USD = this.getPairReserve(pair.reserve1, prices.get(pair.token1.id));

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

  //Need to temporary output info for BSC chain
  formatPoolTokenBSCTmp(token, prices: Map<Address, number>): PoolTokenDto {
    return plainToClass(PoolTokenDto, {
      address: token.id,
      name: token.name,
      symbol: token.symbol,
      reserve: null,
      decimals: Number(token.decimals),
      value: token.balance * prices.get(token.id),
      balance: Number(token.balance),
      price: prices.get(token.id),
    });
  }

  formatPoolToken(
    token: ISushiSwapSubgraphToken,
    reserve: string,
    userPoolShare: string,
    reserveUSD: string,
    prices: Map<Address, number>,
  ): PoolTokenDto {
    const value = Number(userPoolShare) * Number(reserveUSD);

    return plainToClass(PoolTokenDto, {
      address: token.id,
      name: token.name,
      symbol: token.symbol,
      reserve: reserve,
      decimals: Number(token.decimals),
      value: value.toString(),
      balance: value / prices.get(token.id),
      price: prices.get(token.id),
    });
  }

  private async getAssets(tokens, chain): Promise<Map<Address, Asset>> {
    const { data } = await this.accountService.getAssets(tokens, [chain.id]);
    return new Map(data?.map((cur) => [cur.address, cur]) || []);
  }

  private async getPrices(tokens, chain): Promise<Map<Address, number>> {
    const { prices } = await this.priceService.getTokenPricesFetch(tokens, chain.id);
    // TODO: priceService type is typed as 'number' but actually returns a string
    return new Map(
      Object.entries(prices || {}).map(([address, price]) => [address, Number(price)]),
    );
  }
}

export default SushiSwapProtocolV2;
