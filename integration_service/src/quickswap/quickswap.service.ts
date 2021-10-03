import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { Logger } from 'src/Logger/Logger.service';
import { IncomeLiquidityPosition } from 'src/dto/liquidity.position.dto';
import { PriceService } from 'src/price/price.service';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum, ProjectEnum, ProtocolNameEnum } from 'src/common/enum';
import { Address } from 'src/common/types';

import { AccountService } from '../account/account.service';
import {
  IntegrationClaimableTokenDto,
  IntegrationStakingPositionDto,
  LPToken,
  PoolTokenDto,
} from '../integrations/integrations.dto';
import { BaseData } from '../interfaces/transactions.interfaces';
import { Mapper } from '../mappers/mapper';
import { QuickswapSubgraph } from '../thegraph/quickswap.subgraph';
import { decimalsDivider, getUniqueAndToLowerCaseArrayData } from '../utils/util';
import { PairDto } from './dto/subgraph';
import { LPTokenPair } from './interfaces';
import { QUICKSWAP_REWARDS_TOKEN_ADDRESS, QUICKSWAP_STAKING_CONTRACTS } from './utils/constants';
import { getContractByPair } from './utils/utils';
import { Web3Service } from './web3/web3.service';

@Injectable()
export class QuickswapService {
  constructor(
    private readonly mapper: Mapper,
    private readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly subgraph: QuickswapSubgraph,
    private readonly logger: Logger,
    private readonly web3: Web3Service,
  ) {}

  private async getLPTokens(pair: PairDto, poolShare: number): Promise<PoolTokenDto[]> {
    return await Promise.all(
      [0, 1].map(async (_) => {
        const token = _ ? pair.token1 : pair.token0;
        const reserve = _ ? pair.reserve1 : pair.reserve0;
        const price = _ ? pair.token1Price : pair.token0Price;

        const balance = new BigNumber(poolShare) //
          .times(reserve)
          .toString();

        const value = new BigNumber(balance) //
          .times(price)
          .toNumber();

        return {
          address: token.id,
          name: token.name,
          symbol: token.symbol,
          decimals: +token.decimals,
          price: +price,
          reserve: reserve,
          balance,
          value,
        };
      }),
    );
  }

  public async getDataByAddresses(addresses: string, chainId?: ChainIdEnum): Promise<BaseData[]> {
    try {
      const originAddresses = addresses.split(',');
      const uniqueAddresses = getUniqueAndToLowerCaseArrayData(originAddresses);

      const uniswapLiquidityPositions = new Map<Address, IncomeLiquidityPosition[]>();
      const sushiswapStakingPosition = new Map<Address, IntegrationStakingPositionDto[]>();

      const { data: rawRewardTokens } = await this.accountService.getAssets(
        [QUICKSWAP_REWARDS_TOKEN_ADDRESS],
        [chainId || ChainIdEnum.plg],
      );
      const rawRewardToken = rawRewardTokens[0];

      const { prices } = await this.priceService.getTokenPricesFetch(
        [rawRewardToken.address],
        chainId || ChainIdEnum.plg,
      );

      const rewardTokenPrice = prices[rawRewardToken.address];

      const { data: usersData, errors: usersErrors } = await this.subgraph.getUsers(
        uniqueAddresses,
      );
      if (usersErrors?.length) {
        throw usersErrors[0];
      }
      const { users: usersPools } = usersData;

      const stakingPairsAddresses = new Set<Address>();
      usersPools.forEach(({ liquidityPositions }) =>
        liquidityPositions.forEach(({ pair: { id } }) => stakingPairsAddresses.add(id)),
      );

      const { data: pairsData, errors: pairsErrors } = await this.subgraph.getPairs(
        Array.from(stakingPairsAddresses),
      );
      if (pairsErrors?.length) {
        throw pairsErrors[0];
      }
      const { pairs: liquidityPositionPairs } = pairsData;

      for (const address of uniqueAddresses) {
        const userLiquidityPositions = usersPools.find(
          (_) => _.id.toLocaleLowerCase() === address.toLocaleLowerCase(),
        );

        const pairs = await Promise.all(
          liquidityPositionPairs.map((pair) => ({
            liquidityTokenBalance:
              userLiquidityPositions.liquidityPositions.find(({ pair: { id } }) => id === pair.id)
                .liquidityTokenBalance || null,
            user: address,
            pair,
          })),
        );
        uniswapLiquidityPositions.set(address, pairs);

        const stakingPosition = await Promise.all(
          QUICKSWAP_STAKING_CONTRACTS.map(async ({ pairAddress }) => {
            const balance = new BigNumber(
              await this.web3.getBalanceOf(getContractByPair(pairAddress), address),
            )
              .div(decimalsDivider(rawRewardToken.decimals))
              .toString();
            const claimable = await this.web3.getClaimable(getContractByPair(pairAddress), address);

            const claimableDataBalance = new BigNumber(claimable) //
              .div(decimalsDivider(rawRewardToken.decimals))
              .toString();

            const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
              address: rawRewardToken.address,
              name: rawRewardToken.name,
              symbol: rawRewardToken.symbol,
              decimals: rawRewardToken.decimals,
              totalSupply: rawRewardToken.totalSupply,
              price: rewardTokenPrice,
              claimableData: {
                balance: claimableDataBalance,
                value: new BigNumber(claimableDataBalance) //
                  .times(rewardTokenPrice)
                  .toString(),
              },
            });

            const stakingToken = plainToClass(LPToken, {
              address: pairAddress,
              name: 'Uniswap V2',
              symbol: 'UNI-V2',
              decimals: 18,
              tokens: [],
            });

            const LPStakingTokensAddresses = await this.web3.getStakingTokensAddresses(pairAddress);

            LPStakingTokensAddresses.forEach((tokenAddress) =>
              stakingToken.tokens.push({
                address: tokenAddress,
                name: null,
                symbol: null,
                decimals: null,
                reserve: null,
                value: null,
                balance: null,
                price: null,
              }),
            );

            return {
              address,
              poolId: null,
              poolName: null,
              staked: balance,
              rewardToken,
              stakingToken,
            };
          }),
        );

        sushiswapStakingPosition.set(
          address,
          stakingPosition.filter((_) => +_.staked),
        );
      }

      for (const address of uniqueAddresses) {
        const stakingPositions = sushiswapStakingPosition.get(address);
        const {
          data: { pairs: stakingPairsData },
        } = await this.subgraph.getPairs(stakingPositions.map((_) => _.stakingToken.address));

        const resultStakingPositions = await Promise.all(
          stakingPositions.map(
            async (
              stakingPosition: IntegrationStakingPositionDto,
            ): Promise<IntegrationStakingPositionDto> => {
              const stakingPairs = new Map<Address, LPTokenPair>();
              const stakingTokenAddress = stakingPosition.stakingToken.address;

              for await (const pair of stakingPairsData) {
                const poolShare = new BigNumber(stakingPosition.staked)
                  .div(pair.totalSupply)
                  .toNumber();

                stakingPairs.set(pair.id, {
                  ...pair,
                  tokens: await this.getLPTokens(pair, poolShare),
                });
              }

              const { totalSupply, tokens } = stakingPairs.get(stakingTokenAddress);

              return {
                ...stakingPosition,
                stakingToken: plainToClass(LPToken, {
                  ...stakingPosition.stakingToken,
                  totalSupply,
                  tokens,
                }),
              };
            },
          ),
        );

        sushiswapStakingPosition.set(address, resultStakingPositions);
      }

      return await this.mapper.mapData(
        uniqueAddresses,
        originAddresses,
        {
          uniswapLiquidityPositions: uniswapLiquidityPositions,
          sushiswapStakingPosition: sushiswapStakingPosition,
        },
        ProjectEnum.quickswap,
        ProtocolNameEnum.quickswap,
        chainId || ChainIdEnum.plg,
      );
    } catch (error) {
      this.logger.error(error, 'QuickswapService.getDataByAddress');
      throw error;
    }
  }
}

export default QuickswapService;
