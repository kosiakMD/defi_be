import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainIdEnum,
  ClaimAbleTokenDto,
  CurrentPricesPayload,
  ERC20TokenDto,
  FeatureResultDto,
  LiquidityPoolFeatureDto,
  LiquidityPosition,
  LiquidityPositionDto,
  PlatformPoolTokenDto,
  PoolTokenDto,
  PriceResponseDto,
  ProjectEnum,
  UniswapProtocolEnum,
  UniswapV3Position,
} from '@app/common';
import { Logger } from '@app/common/Logger/Logger.service';

import { AccountService } from '../../account/account.service';
import { PoolToken } from '../../interfaces/transactions.interfaces';
import { PriceService } from '../../price/price.service';
import { UniswapV3Subgraph } from '../../thegraph/uniswap.v3.subgraph';
import { objectUpdate } from '../../utils/object';
import { calculatePositionAmounts, calculateTokensOwed } from '../../utils/uniswapV3PositionMath';
import { FeatureEnum } from '../features/features.enum';
import { tokenDictionary } from '../protocols.dictionaries';
import AbstractProtocol from './abstractProtocol';
import UniswapLikeProtocol from './uniswapLike/uniswapLikeProtocol';

@Injectable()
export class UniswapProtocolV3 extends UniswapLikeProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.uniswap;
  readonly name = UniswapProtocolEnum.uniswapV3;
  readonly displayName = 'Uniswap V3';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools],
  };
  protected dataProvider;
  protected feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly uniswapV3Subgraph: UniswapV3Subgraph,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.dataProvider = this;
  }

  async getDataByAddresses(address: Address, chainId: ChainIdEnum): Promise<any> {
    const { positions } = await this.uniswapV3Subgraph.getPositions(address, chainId);
    const { prices } = await this.getPricedTokens(positions, chainId);

    return [
      {
        liquidityPositions: this.mapToLiquidityPosition(positions, prices),
      },
    ];
  }

  getPricedTokens(
    positions: UniswapV3Position[],
    chainId: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>> {
    const uniqueTokens = [
      ...new Set(
        positions.flatMap((position) => [
          position.token0.address.toLowerCase(),
          position.token1.address.toLowerCase(),
        ]),
      ),
    ];

    return this.priceService.getTokenPricesFetch(uniqueTokens, chainId);
  }

  mapToLiquidityPosition(
    positions: UniswapV3Position[],
    prices: CurrentPricesPayload,
  ): LiquidityPositionDto[] {
    return positions
      .map((position) => {
        const { amount0, amount1 } = calculatePositionAmounts({
          tickCurrent: Number(position.pool.tick),
          tickLower: Number(position.tickLower.tickIdx),
          tickUpper: Number(position.tickUpper.tickIdx),
          token0Decimal: position.token0.decimals,
          token1Decimal: position.token1.decimals,
          liquidity: position.liquidity,
          sqrtPrice: position.pool.sqrtPrice,
        });

        // This is an ERC721 token, not an ERC20 token
        const lpToken = plainToClass(ERC20TokenDto, {
          address: position.pool.id,
          decimals: 0,
          totalSupply: 1,
        });

        const token0 = plainToClass(PlatformPoolTokenDto, {
          address: position.token0.address,
          name: position.token0.name,
          symbol: position.token0.symbol,
          amount: amount0,
          decimals: Number(position.token0.decimals),
          reserve: position.pool.totalValueLockedToken0,
          priceUSD: prices[position.token0.address.toLowerCase()],
        });

        const token1 = plainToClass(PlatformPoolTokenDto, {
          address: position.token1.address,
          name: position.token1.name,
          symbol: position.token1.symbol,
          amount: amount1,
          decimals: Number(position.token1.decimals),
          reserve: position.pool.totalValueLockedToken1,
          priceUSD: prices[position.token1.address.toLowerCase()],
        });

        const { amount0: rewardsAmount0, amount1: rewardsAmount1 } = calculateTokensOwed({
          tickCurrent: position.pool.tick,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
          feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
          feeGrowthGlobal0X128: position.pool.feeGrowthGlobal0X128,
          feeGrowthGlobal1X128: position.pool.feeGrowthGlobal1X128,
          liquidity: position.liquidity,
        });

        const reward0 = plainToClass(ClaimAbleTokenDto, {
          address: position.token0.address,
          name: position.token0.name,
          symbol: position.token0.symbol,
          amount: Number(rewardsAmount0) / 10 ** Number(position.token0.decimals),
          decimals: Number(position.token0.decimals),
          reserve: position.pool.totalValueLockedToken0,
          priceUSD: prices[position.token0.address.toLowerCase()],
        });

        const reward1 = plainToClass(ClaimAbleTokenDto, {
          address: position.token1.address,
          name: position.token1.name,
          symbol: position.token1.symbol,
          amount: Number(rewardsAmount1) / 10 ** Number(position.token1.decimals),
          decimals: Number(position.token1.decimals),
          reserve: position.pool.totalValueLockedToken1,
          priceUSD: prices[position.token1.address.toLowerCase()],
        });

        return plainToClass(LiquidityPositionDto, {
          lpToken, // TODO: This is now an NFT not ERC20 token
          pool: { address: position.pool.id, name: null },
          lpTokenBalance: '0',
          exitedAt: null,
          rewards: [reward0, reward1],
          earnedFeeUSD: 0,
          poolTokens: [token0, token1], // from subgraph, missing 'amount' 'priceUSD'
          project: this.project,
        });
      })
      .filter((position) => position.poolTokens.some((token) => Number(token.amount) > 0));
  }

  protected async transformPools(
    rawPools: LiquidityPosition[],
    chainId: ChainIdEnum,
  ): Promise<{ errors: any[]; data: FeatureResultDto<LiquidityPoolFeatureDto> }> {
    const result = {
      errors: [] as any[],
      data: {
        totalValue: 0,
        items: [],
      } as FeatureResultDto<LiquidityPoolFeatureDto>,
    };

    try {
      await this.handleMissedData(rawPools, chainId, result.errors);
    } catch (e) {
      this.logger.error(e);
      result.errors.push(e.message);
    }

    const outputPools: LiquidityPoolFeatureDto[] = rawPools?.reduce((resultArray, inputPool) => {
      const tokens: PoolTokenDto[] = [];
      const rewards: PoolTokenDto[] = [];
      let TVL = 0; // sum(reserve * price)
      let userValue = 0; // sum of values
      // Pool Tokens
      inputPool.poolTokens.forEach((token: PoolToken) => {
        const formattedToken = plainToClass(PoolTokenDto, {});
        objectUpdate(formattedToken, token, tokenDictionary, 'default');
        const { price, reserve, balance } = formattedToken;
        // value
        formattedToken.value = Number(balance) * price ?? null;
        // user
        userValue += formattedToken.value;
        // TVL
        if (reserve) {
          TVL += Number(reserve) * price;
        }

        tokens.push(formattedToken);
      });

      inputPool.rewards.forEach((token: PoolToken) => {
        const formattedToken = plainToClass(PoolTokenDto, {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          reserve: token.reserve,
          price: token.priceUSD,
          decimals: token.decimals,
          balance: token.amount,
          value:
            Number(token.amount) && token.priceUSD ? Number(token.amount) * token.priceUSD : null,
        });
        // user
        userValue += formattedToken.value;

        rewards.push(formattedToken);
      });

      result.data.totalValue += userValue;
      // Pool
      const outPool: LiquidityPoolFeatureDto = plainToClass(LiquidityPoolFeatureDto, {
        address: inputPool.pool.address,
        name: inputPool.pool.name,
        lpToken: inputPool.lpToken,
        TVL: TVL,
        fee: {
          rate: this.feeRate,
        },
        user: {
          value: userValue,
          share: userValue / TVL,
        },
        // TODO need to add 1 more call to subgraph after pool data will be ready
        statistic: {
          day: {
            // volume: 1,
            // fee: 1,
          },
        },
        rewards: rewards,
        tokens: tokens,
      });

      if (outPool.user.value) {
        resultArray.push(outPool);
      }

      return resultArray;
    }, []);

    result.data.items = outputPools;

    if (outputPools.length !== rawPools.length) {
      this.logger.debug(
        `Liquidity Positions Filtered: ${rawPools.length - outputPools.length}/${rawPools.length}`,
        'uniswapProtocolV3',
      );
    }

    return result;
  }
}

export default UniswapProtocolV3;
