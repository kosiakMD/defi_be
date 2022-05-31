import { plainToClass } from 'class-transformer';
import { soliditySha3 } from 'web3-utils';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainDto, ClaimableDto, IntegrationClaimableTokenDto } from '@app/common/dto';
import { BaseData } from '@app/common/dto/base-data';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import {
  ChainAbbrEnum,
  FeatureEnum,
  ProjectEnum,
  ProtocolNameEnum,
  UniswapProtocolEnum,
} from '@app/common/enum';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import { Logger } from '@app/common/logger/logger.service';
import { Address } from '@app/common/types';
import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/erc20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset } from '../../../common/interfaces/transactions.interfaces';
import {
  calculatePositionAmounts,
  calculateTokensOwed,
} from '../../../common/utils/uniswap-v3-position.util';

import { AccountService } from '../../microservice/account.service';
import { PriceService } from '../../microservice/price.service';
import { UniswapV3Subgraph } from '../../subgraph/subgraphs/uniswap-v3.subgraph';
import DataProviderProtocol from './data-provider-protocol';
import { NonfungiblePositionManager } from './uniswap-v3/contracts/nonfungible-position-manager';
import { UniswapV3Factory } from './uniswap-v3/contracts/uniswap-v3-factory';
import { UniswapV3Pool } from './uniswap-v3/contracts/uniswap-v3-pool';
import { IPool, ITokenPosition } from './uniswap-v3/uniswap.interfaces';

@Injectable()
export class UniswapProtocolV3 extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.opt, ChainAbbrEnum.arbi, ChainAbbrEnum.plg];
  readonly project = ProjectEnum.uniswap;
  readonly name = UniswapProtocolEnum.uniswapV3;
  readonly displayName = 'Uniswap V3';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools],
    [ChainAbbrEnum.opt]: [FeatureEnum.pools],
    [ChainAbbrEnum.arbi]: [FeatureEnum.pools],
    [ChainAbbrEnum.plg]: [FeatureEnum.pools],
  };
  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly uniswapV3Subgraph: UniswapV3Subgraph,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly multicall: MulticallAggregator,
  ) {
    super();
    this.dataProvider = this;
  }

  /**
   * Gets all tokens owned to a given user
   *
   * @param addresses user addresses
   * @param chain current chain
   * @returns map of user address => owned token id's
   */
  private async getUserTokens(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<Map<Address, number[]>> {
    const balanceCalls = new Map();
    const nft = new NonfungiblePositionManager(chain);
    // Loop through addresses, getting all balances
    addresses.forEach((address) =>
      balanceCalls.set(`balanceOf(${address})`, nft.balanceOf(address)),
    );
    const balanceResults = await this.multicall.handleInBatches(balanceCalls, chain.id);

    // Loop through balances, for each token, get the token ID
    const tokenCalls = new Map();
    addresses.forEach((address) => {
      const balance = Number(balanceResults.get(`balanceOf(${address})`).output.data.toString());
      Array.from(Array(balance).keys()).forEach((index) => {
        tokenCalls.set(
          `tokenOfOwnerByIndex(${address}, ${index})`,
          nft.tokenOfOwnerByIndex(address, index),
        );
      });
    });

    const tokenResults = await this.multicall.handleInBatches(tokenCalls, chain.id);

    const results = new Map<Address, number[]>();
    // Loop through balances, mapping user address to owned tokens
    // '0xabcd' => [14, 25, 263]
    addresses.forEach((address) => {
      const balance = Number(balanceResults.get(`balanceOf(${address})`).output.data.toString());
      const tokens = [];
      Array.from(Array(balance).keys()).forEach((index) => {
        tokens.push(
          Number(
            tokenResults.get(`tokenOfOwnerByIndex(${address}, ${index})`).output.data.toString(),
          ),
        );
        results.set(address, tokens);
      });
    });

    // returns map of all user tokens Map<Address, TokenId[]>
    return results;
  }

  /**
   * gets all information about a given token
   *
   * @param balances
   * @param chain
   * @returns map of tokenId => token info
   */
  private async getTokenDetails(userTokens: Map<Address, number[]>, chain: ChainDto) {
    // get all tokenId's
    // get positions for each token ID
    const ids = Array.from(userTokens.values()).flat();

    const nft = new NonfungiblePositionManager(chain);

    const calls = new Map();

    ids.forEach((id) => calls.set(`positions(${id})`, nft.positions(id)));

    const positionResults = await this.multicall.handleInBatches(calls, chain.id);

    const factory = new UniswapV3Factory(chain);
    const poolCalls = new Map();
    ids.forEach((id) => {
      const { token0, token1, fee } = positionResults.get(`positions(${id})`).output.data;
      poolCalls.set(
        `getPool(${token0}, ${token1})`,
        factory.getPool(token0, token1, fee.toString()),
      );
    });

    const poolResults = await this.multicall.handleInBatches(poolCalls, chain.id);

    const results = new Map<number, ITokenPosition>();
    ids.forEach((id) => {
      const position = positionResults.get(`positions(${id})`).output.data;
      const data = {
        token0: position.token0.toLowerCase(),
        token1: position.token1.toLowerCase(),
        fee: Number(position.fee.toString()),
        pool: poolResults
          .get(`getPool(${position.token0}, ${position.token1})`)
          .output.data.toLowerCase(),
        tickLower: Number(position.tickLower.toString()),
        tickUpper: Number(position.tickUpper.toString()),
        feeGrowthInside0LastX128: position.feeGrowthInside0LastX128.toFixed(),
        feeGrowthInside1LastX128: position.feeGrowthInside1LastX128.toFixed(),
        liquidity: position.liquidity.toFixed(),
        key: this.computeKey(nft.address, position.tickLower, position.tickUpper),
        tokensOwed0: position.tokensOwed0.toFixed(),
        tokensOwed1: position.tokensOwed1.toFixed(),
      };

      results.set(id, data);
    });

    return results;
  }

  private computeKey(address: Address, tickLower: number, tickUpper: number) {
    return soliditySha3(
      { t: 'address', v: address },
      { t: 'int24', v: tickLower },
      { t: 'int24', v: tickUpper },
    );
  }

  /**
   * gest unique positionKeys and fetches all required position info
   *
   * @param positions all user positions
   * @param chain
   * @return map of positionKey => poolInfo
   */
  private async getPoolDetails(
    positions: Map<number, ITokenPosition>,
    chain: ChainDto,
  ): Promise<Map<string, IPool>> {
    // liquidity uint128, feeGrowthInside0LastX128 uint256, feeGrowthInside1LastX128 uint256, tokensOwed0 uint128, tokensOwed1 uint128
    // user tokensOwed is relative to positionLiquidity/pool-liquidity ?
    const positionCalls = new Map();

    positions.forEach((position) => {
      const pool = new UniswapV3Pool(position.pool);
      positionCalls.set(`${position.key}.feeGrowthGlobal0X128`, pool.feeGrowthGlobal0X128());
      positionCalls.set(`${position.key}.feeGrowthGlobal1X128`, pool.feeGrowthGlobal1X128());
      positionCalls.set(
        `${position.key}.ticks(${position.tickLower})`,
        pool.ticks(position.tickLower),
      );
      positionCalls.set(
        `${position.key}.ticks(${position.tickUpper})`,
        pool.ticks(position.tickUpper),
      );
      positionCalls.set(`${position.key}.slot0`, pool.slot0());
      positionCalls.set(`positions(${position.key})`, pool.positions(position.key));
    });

    const positionResults = await this.multicall.handleInBatches(positionCalls, chain.id);
    const results = new Map<string, IPool>();

    positions.forEach((position) => {
      const response = positionResults.get(`positions(${position.key})`).output.data;
      const slot0 = positionResults.get(`${position.key}.slot0`).output.data;
      const tickLower = positionResults.get(`${position.key}.ticks(${position.tickLower})`).output
        .data;
      const tickUpper = positionResults.get(`${position.key}.ticks(${position.tickUpper})`).output
        .data;

      const feeGrowthGlobal0X128 = positionResults.get(`${position.key}.feeGrowthGlobal0X128`)
        .output.data;
      const feeGrowthGlobal1X128 = positionResults.get(`${position.key}.feeGrowthGlobal1X128`)
        .output.data;

      results.set(position.key, {
        address: position.pool,
        token0: position.token0,
        token1: position.token1,
        feeGrowthGlobal0X128: feeGrowthGlobal0X128.toFixed(),
        feeGrowthGlobal1X128: feeGrowthGlobal1X128.toFixed(),
        sqrtPrice: slot0.sqrtPriceX96.toFixed(),
        tickCurrent: Number(slot0.tick.toFixed()),
        tickLower: {
          tick: position.tickLower,
          feeGrowthOutside0X128: tickLower.feeGrowthOutside0X128.toFixed(),
          feeGrowthOutside1X128: tickLower.feeGrowthOutside1X128.toFixed(),
        },
        tickUpper: {
          tick: position.tickUpper,
          feeGrowthOutside0X128: tickUpper.feeGrowthOutside0X128.toFixed(),
          feeGrowthOutside1X128: tickUpper.feeGrowthOutside1X128.toFixed(),
        },
        liquidity: response.liquidity.toFixed(),
        feeGrowthInside0LastX128: response.feeGrowthInside0LastX128.toFixed(),
        feeGrowthInside1LastX128: response.feeGrowthInside1LastX128.toFixed(),
        tokensOwed0: response.tokensOwed0.toFixed(),
        tokensOwed1: response.tokensOwed1.toFixed(),
      });
    });

    return results;
  }

  private async getUnderlyingAssets(
    positions: Map<number, ITokenPosition>,
    chain: ChainDto,
  ): Promise<[Map<Address, Asset>, Map<Address, number>, Map<Address, Map<Address, number>>]> {
    const reserves = new Map();
    const addressSet = new Set<string>();
    positions.forEach((position) => {
      // get unique token addresses
      addressSet.add(position.token0);
      addressSet.add(position.token1);
      // Set pool token map
      reserves.set(
        position.pool,
        new Map([
          // 0 for starting balance
          [position.token0, 0],
          [position.token1, 0],
        ]),
      );
    });
    const addresses = Array.from(addressSet);

    if (!addresses.length) {
      return [new Map(), new Map(), reserves];
    }

    const [tokens, { prices }] = await Promise.all([
      this.accountService.getAssets(addresses, [chain.id]),
      this.priceService.getTokenPricesFetch(addresses, chain.id),
      this.fillReserves(reserves, chain), // mutate reserves values (no return value)
    ]);

    return [
      new Map(tokens.data.map((token) => [token.address, token])),
      new Map(Object.entries(prices).map(([address, price]) => [address, Number(price)])),
      reserves,
    ];
  }

  private async fillReserves(reserves: Map<Address, Map<Address, number>>, chain: ChainDto) {
    const calls = new Map();
    reserves.forEach((pool, address) => {
      pool.forEach((zero, token) => {
        calls.set(`${token}-balanceOf(${address})`, new ERC20(token).balanceOf(address));
      });
    });

    const results = await this.multicall.handleInBatches(calls, chain.id);

    // Mutate/update original map
    reserves.forEach((pool, address) => {
      pool.forEach((zero, token) => {
        reserves
          .get(address)
          .set(token, results.get(`${token}-balanceOf(${address})`).output.data.toString());
      });
    });
  }

  async getUserPositions(
    addresses: Address[],
    chain: ChainDto,
    inputUsersTokens?: Map<string, number[]>,
  ): Promise<[BaseData[], string[]]> {
    const userTokens = inputUsersTokens
      ? inputUsersTokens
      : await this.getUserTokens(addresses, chain);

    const userPositions = await this.getTokenDetails(userTokens, chain);
    const pools = await this.getPoolDetails(userPositions, chain);
    const [assets, prices, reserves] = await this.getUnderlyingAssets(userPositions, chain);

    const baseData: BaseDataLp[] = [];
    const errors: string[] = [];

    userTokens.forEach((tokens, address) => {
      const items = [];

      tokens.forEach((tokenId) => {
        const position = userPositions.get(tokenId);
        const pool = pools.get(position.key);

        const token0Asset = assets.get(position.token0);
        const token1Asset = assets.get(position.token1);

        if (!token1Asset || !token0Asset || pool.liquidity === '0') {
          return;
        }

        const { amount0, amount1 } = calculatePositionAmounts({
          tickCurrent: pool.tickCurrent,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          token0Decimal: token0Asset.decimals,
          token1Decimal: token1Asset.decimals,
          liquidity: position.liquidity,
          sqrtPrice: pool.sqrtPrice,
        });

        const { amount0: rewardsAmount0, amount1: rewardsAmount1 } = calculateTokensOwed({
          tickCurrent: pool.tickCurrent,
          tickLower: pool.tickLower,
          tickUpper: pool.tickUpper,
          feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
          feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
          feeGrowthGlobal0X128: pool.feeGrowthGlobal0X128,
          feeGrowthGlobal1X128: pool.feeGrowthGlobal1X128,
          liquidity: position.liquidity,
        });

        const token0: PoolTokenDto = plainToClass(PoolTokenDto, {
          address: token0Asset.address,
          name: token0Asset.name,
          symbol: token0Asset.symbol,
          decimals: token0Asset.decimals,
          reserve: normalizeDecimals(
            reserves
              .get(pool.address) //
              .get(token0Asset.address)
              .toString(),
            token0Asset.decimals,
          ),
          value: Number(amount0) * prices.get(token0Asset.address),
          balance: Number(amount0),
          price: prices.get(token0Asset.address),
          positionInPool: 0,
          weight: 0.5,
        });

        const token1: PoolTokenDto = plainToClass(PoolTokenDto, {
          address: token1Asset.address,
          name: token1Asset.name,
          symbol: token1Asset.symbol,
          decimals: token1Asset.decimals,
          reserve: normalizeDecimals(
            reserves
              .get(pool.address) //
              .get(token1Asset.address)
              .toString(),
            token1Asset.decimals,
          ),
          value: Number(amount1) * prices.get(token1Asset.address),
          balance: Number(amount1),
          price: prices.get(token1Asset.address),
          positionInPool: 1,
          weight: 0.5,
        });

        const rewards0 = normalizeDecimals(rewardsAmount0, token0.decimals);
        const rewards1 = normalizeDecimals(rewardsAmount1, token1.decimals);

        const reward0Token = plainToClass(IntegrationClaimableTokenDto, {
          address: token0.address,
          name: token0.name,
          symbol: token0.symbol,
          decimals: token0.decimals,
          price: prices.get(token0Asset.address),
          claimableData: plainToClass(ClaimableDto, {
            balance: rewards0,
            value: prices.get(token0Asset.address) * rewards0,
          }),
        });

        const reward1Token = plainToClass(IntegrationClaimableTokenDto, {
          address: token1.address,
          name: token1.name,
          symbol: token1.symbol,
          decimals: token1.decimals,
          price: prices.get(token1Asset.address),
          claimableData: plainToClass(ClaimableDto, {
            balance: rewards1,
            value: prices.get(token1Asset.address) * rewards1,
          }),
        });

        const poolFeature: LiquidityPoolFeature = plainToClass(LiquidityPoolFeature, {
          address: pool.address,
          lpToken: {
            // Its an NFT. fake data here
            address: pool.address,
            decimals: 0,
            totalSupply: 1,
          },
          tokens: [token0, token1],
          rewards: [reward0Token, reward1Token],
        });

        // If the total value combined is greater than 0
        // Add to user positions
        if (token0.value + token1.value) {
          items.push(poolFeature);
        }
      });

      baseData.push(
        plainToClass(BaseDataLp, {
          chain,
          projectName: ProjectEnum.uniswap,
          protocolName: ProtocolNameEnum.uniswapV3,
          userAddress: address,
          feature: FeatureEnum.pools,
          items,
        }),
      );
    });

    return [baseData, errors];
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    try {
      const [bd, errors] = await this.getUserPositions(addresses, chain);
      return [bd, errors];
    } catch (e) {
      return [[], [e.message]];
    }
  }
}

export default UniswapProtocolV3;
