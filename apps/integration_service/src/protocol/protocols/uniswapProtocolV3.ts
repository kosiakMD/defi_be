import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  // TODO: disabled until reward math is fixed
  // ClaimAbleTokenDto,
  Address,
  ChainAbbrEnum,
  ChainDto,
  ChainIdEnum,
  CurrentPricesPayload,
  ERC20TokenDto,
  LiquidityPositionDto,
  PlatformPoolTokenDto,
  PriceResponseDto,
  ProjectEnum,
  UniswapProtocolEnum,
  UniswapV3Position,
} from '@app/common';
import { FeatureEnum } from '@app/common';
import { Logger } from '@app/common/Logger/Logger.service';

import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import { UniswapV3Subgraph } from '../../thegraph/uniswap.v3.subgraph';
import {
  // TODO: disabled until reward math is fixed
  // calculateTokensOwed
  calculatePositionAmounts,
} from '../../utils/uniswapV3PositionMath';
import DataProviderProtocol from './dataProviderProtocol';

@Injectable()
export class UniswapProtocolV3 extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.eth];
  readonly project = ProjectEnum.uniswap;
  readonly name = UniswapProtocolEnum.uniswapV3;
  readonly displayName = 'Uniswap V3';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools],
  };
  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly uniswapV3Subgraph: UniswapV3Subgraph,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.dataProvider = this;
  }

  // overrider
  async getData(address: Address, chain: ChainDto): Promise<any> {
    const { positions } = await this.uniswapV3Subgraph.getPositions(address, chain.id);
    const { prices } = await this.getPricedTokens(positions, chain.id);

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

        // TODO: disabled until reward math is fixed
        // const { amount0: rewardsAmount0, amount1: rewardsAmount1 } = calculateTokensOwed({
        //   tickCurrent: position.pool.tick,
        //   tickLower: position.tickLower,
        //   tickUpper: position.tickUpper,
        //   feeGrowthInside0LastX128: position.feeGrowthInside0LastX128,
        //   feeGrowthInside1LastX128: position.feeGrowthInside1LastX128,
        //   feeGrowthGlobal0X128: position.pool.feeGrowthGlobal0X128,
        //   feeGrowthGlobal1X128: position.pool.feeGrowthGlobal1X128,
        //   liquidity: position.liquidity,
        // });

        // const reward0 = plainToClass(ClaimAbleTokenDto, {
        //   address: position.token0.address,
        //   name: position.token0.name,
        //   symbol: position.token0.symbol,
        //   amount: Number(rewardsAmount0) / 10 ** Number(position.token0.decimals),
        //   decimals: Number(position.token0.decimals),
        //   reserve: position.pool.totalValueLockedToken0,
        //   priceUSD: prices[position.token0.address.toLowerCase()],
        // });

        // const reward1 = plainToClass(ClaimAbleTokenDto, {
        //   address: position.token1.address,
        //   name: position.token1.name,
        //   symbol: position.token1.symbol,
        //   amount: Number(rewardsAmount1) / 10 ** Number(position.token1.decimals),
        //   decimals: Number(position.token1.decimals),
        //   reserve: position.pool.totalValueLockedToken1,
        //   priceUSD: prices[position.token1.address.toLowerCase()],
        // });

        return plainToClass(LiquidityPositionDto, {
          lpToken, // TODO: This is now an NFT not ERC20 token
          pool: { address: position.pool.id, name: null },
          lpTokenBalance: '0',
          exitedAt: null,
          // TODO: disabled until reward math is fixed
          // rewards: [reward0, reward1],
          earnedFeeUSD: 0,
          poolTokens: [token0, token1],
          project: this.project,
        });
      })
      .filter((position) => position.poolTokens.some((token) => Number(token.amount) > 0));
  }
}

export default UniswapProtocolV3;
