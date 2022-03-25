import { plainToClass } from 'class-transformer';
import { soliditySha3 } from 'web3-utils';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ChainDto } from '@app/common/dto';
import { BaseData } from '@app/common/dto/BaseData';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/dto/liquidity.pool.dto';
import {
  ChainAbbrEnum,
  FeatureEnum,
  ProjectEnum,
  ProtocolNameEnum,
  UniswapProtocolEnum,
} from '@app/common/enum';
import { Address } from '@app/common/types';
import { keepETHAddresses, normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset } from '../../../common/interfaces/transactions.interfaces';
import { calculatePositionAmounts } from '../../../common/utils/uniswapV3PositionMath';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { UniswapV3Subgraph } from '../../subgraphs/subgraphs/uniswap.v3.subgraph';
import DataProviderProtocol from './dataProviderProtocol';
import { NonfungiblePositionManager } from './uniswapV3/contracts/NonfungiblePositionManager';
import { UniswapV3Factory } from './uniswapV3/contracts/UniswapV3Factory';
import { UniswapV3Pool } from './uniswapV3/contracts/UniswapV3Pool';
import { IPool, ITokenPosition } from './uniswapV3/uniswap.interfaces';

@Injectable()
export class UniswapProtocolV3 extends DataProviderProtocol {
  readonly chains = [
    ChainAbbrEnum.eth,
    ChainAbbrEnum.opt, // optimism is currently unsupported, however the subgraph apears to work
    ChainAbbrEnum.arbi, // arbitrum subgraph fails, so will likely need to re-write using web3
    ChainAbbrEnum.plg,
  ];
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
    // user tokensOwed is relative to positionLiquidity/poolLiquidity ?
    const positionCalls = new Map();

    positions.forEach((position) => {
      const pool = new UniswapV3Pool(position.pool);
      positionCalls.set(`${position.key}.slot0`, pool.slot0());
      positionCalls.set(`positions(${position.key})`, pool.positions(position.key));
    });

    const positionResults = await this.multicall.handleInBatches(positionCalls, chain.id);
    const results = new Map();

    positions.forEach((position) => {
      const response = positionResults.get(`positions(${position.key})`).output.data;
      const slot0 = positionResults.get(`${position.key}.slot0`).output.data;

      results.set(position.key, {
        address: position.pool,
        token0: position.token0,
        token1: position.token1,
        sqrtPrice: slot0.sqrtPriceX96.toFixed(),
        tick: Number(slot0.tick.toFixed()),
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
          [position.token0, 0],
          [position.token1, 0],
        ]),
      );
    });
    const addresses = Array.from(addressSet);

    const tokens = await this.accountService.getAssets(addresses, [chain.id]);
    const { prices } = await this.priceService.getTokenPricesFetch(addresses, chain.id);
    await this.fillReserves(reserves, chain);

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

  private async getUserPositions(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const userTokens = await this.getUserTokens(addresses, chain);
    if (!userTokens.size) {
      return [[], []];
    }
    const baseData: BaseDataLp[] = [];
    const errors: string[] = [];

    const userPositions = await this.getTokenDetails(userTokens, chain);
    const pools = await this.getPoolDetails(userPositions, chain);
    const [assets, prices, reserves] = await this.getUnderlyingAssets(userPositions, chain);

    userTokens.forEach((tokens, address) => {
      const items = [];

      tokens.forEach((tokenId) => {
        const position = userPositions.get(tokenId);
        const pool = pools.get(position.key);

        const poolFeature: LiquidityPoolFeature = plainToClass(LiquidityPoolFeature, {
          address: pool.address,
          lpToken: {
            address: pool.address,
            decimals: 0,
            totalSupply: 1,
          },
          tokens: [],
        });
        const token0Asset = assets.get(position.token0);
        const token1Asset = assets.get(position.token1);

        const rawReserve0 = reserves.get(pool.address).get(token0Asset.address);
        const rawReserve1 = reserves.get(pool.address).get(token1Asset.address);

        if (!token1Asset || !token0Asset || !rawReserve0 || !rawReserve1) {
          return;
        }

        const reserve0 = normalizeDecimals(rawReserve0.toString(), token0Asset.decimals);
        const reserve1 = normalizeDecimals(rawReserve1.toString(), token1Asset.decimals);

        const { amount0, amount1 } = calculatePositionAmounts({
          tickCurrent: pool.tick,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          token0Decimal: token0Asset.decimals,
          token1Decimal: token1Asset.decimals,
          liquidity: position.liquidity,
          sqrtPrice: pool.sqrtPrice,
        });

        const token0: PoolTokenDto = plainToClass(PoolTokenDto, {
          address: token0Asset.address,
          name: token0Asset.name,
          symbol: token0Asset.symbol,
          decimals: token0Asset.decimals,
          reserve: reserve0.toString(),
          value: Number(amount0) * prices.get(token0Asset.address),
          balance: Number(amount0),
          price: prices.get(token0Asset.address),
        });

        const token1: PoolTokenDto = plainToClass(PoolTokenDto, {
          address: token1Asset.address,
          name: token1Asset.name,
          symbol: token1Asset.symbol,
          decimals: token1Asset.decimals,
          reserve: reserve1.toString(),
          value: Number(amount1) * prices.get(token1Asset.address),
          balance: Number(amount1),
          price: prices.get(token1Asset.address),
        });

        poolFeature.tokens.push(token0, token1);

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
    addresses = keepETHAddresses(addresses);
    try {
      const [bd, errors] = await this.getUserPositions(addresses, chain);
      return [bd, errors];
    } catch (e: any) {
      return [[], [e.message]];
    }
  }
}

export default UniswapProtocolV3;
