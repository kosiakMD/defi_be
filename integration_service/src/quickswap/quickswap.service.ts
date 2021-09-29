import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { Logger } from 'src/Logger/Logger.service';
import { IncomeLiquidityPosition } from 'src/dto/liquidity.position.dto';

import { Injectable } from '@nestjs/common';

import { ChainIdEnum, ProjectEnum } from 'src/common/enum';
import { Address } from 'src/common/types';

import { AccountService } from '../account/account.service';
import {
  IntegrationClaimableTokenDto,
  LPToken,
  StakingPositionResponseDto,
} from '../integrations/integrations.dto';
import { Asset, BaseData } from '../interfaces/transactions.interfaces';
import { Mapper } from '../mappers/mapper';
import { QuickswapSubgraph } from '../thegraph/quickswap.subgraph';
import { decimalsDivider, getUniqueAndToLowerCaseArrayData } from '../utils/util';
import { PairDto } from './dto/subgraph';
import { QUICKSWAP_REWARDS_TOKEN_ADDRESS, QUICKSWAP_STAKING_CONTRACTS } from './utils/constants';
import { getContractByPair } from './utils/utils';
import { Web3Service } from './web3/web3.service';

@Injectable()
export class QuickswapService {
  constructor(
    private readonly mapper: Mapper,
    private readonly accountService: AccountService,
    private readonly quickswapSubgraph: QuickswapSubgraph,
    private readonly logger: Logger,
    private readonly web3: Web3Service,
  ) {}

  async getDataByAddresses(
    addresses: string,
    chainId?: ChainIdEnum,
  ): Promise<StakingPositionResponseDto | BaseData[]> {
    try {
      const originAddresses = addresses.split(',');
      const uniqueAddresses = getUniqueAndToLowerCaseArrayData(originAddresses);

      const uniswapLiquidityPositions = new Map<Address, IncomeLiquidityPosition[]>();
      const sushiswapStakingPosition = new Map<Address, any>();

      const { data: rewardTokens } = await this.accountService.getAssets(
        [QUICKSWAP_REWARDS_TOKEN_ADDRESS],
        [chainId],
      );

      const {
        data: { users: usersLiquidityPositions },
      } = await this.quickswapSubgraph.getUsers(uniqueAddresses);

      const stakingPairsAddresses = new Set<Address>();

      usersLiquidityPositions.forEach(({ liquidityPositions }) =>
        liquidityPositions.forEach(({ pair: { id } }) => stakingPairsAddresses.add(id)),
      );

      const {
        data: { pairs: liquidityPositionPairs },
      } = await this.quickswapSubgraph.getPairs(Array.from(stakingPairsAddresses));

      for (const address of uniqueAddresses) {
        const userLiquidityPositions = usersLiquidityPositions.find(
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
            const balance = await this.web3.getBalanceOf(getContractByPair(pairAddress), address);
            const claimable = await this.web3.getClaimable(getContractByPair(pairAddress), address);

            const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
              ...rewardTokens[0],
              claimableData: {
                balance: new BigNumber(claimable) //
                  .div(decimalsDivider(18))
                  .toString(),
                value: new BigNumber(balance) //
                  .div(decimalsDivider(18))
                  .toString(),
              },
            });

            rewardToken.claimableData;

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
              amount: balance,
              staked: new BigNumber(balance) //
                .div(decimalsDivider(18))
                .toString(),
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

      const tokens = new Set<Address>();

      for (const address of uniqueAddresses) {
        const stakingPositions = sushiswapStakingPosition.get(address);

        stakingPositions.forEach(({ stakingToken }) =>
          stakingToken.tokens.forEach(({ address }) => tokens.add(address)),
        );
      }

      const filledTokens: Asset[] = [];

      if (tokens.size) {
        const { data: assets } = await this.accountService.getAssets(Array.from(tokens).flat(), [
          chainId,
        ]);
        filledTokens.push(...assets);
      }

      for (const address of uniqueAddresses) {
        const stakingPairs = new Map<Address, PairDto>();

        const stakingPositions = sushiswapStakingPosition.get(address);
        const {
          data: { pairs: stakingPairsData },
        } = await this.quickswapSubgraph.getPairs([
          ...stakingPositions.map((_: any) => _.stakingToken.address),
        ]);

        stakingPairsData.forEach((_) => stakingPairs.set(_.id, _));

        sushiswapStakingPosition.set(
          address,
          stakingPositions.map((stakingPosition: any) => {
            const stakingTokenAddress = stakingPosition.stakingToken.address;
            const stakingPair = stakingPairs.get(stakingTokenAddress);

            const token0balance = new BigNumber(stakingPosition.amount)
              .div(stakingPair.totalSupply)
              .times(stakingPair.reserve0)
              .div(new BigNumber(10).pow(stakingPair.token0.decimals))
              .toString();

            const token0value = new BigNumber(token0balance) //
              .times(stakingPair.reserve0)
              .toNumber();

            const token1balance = new BigNumber(stakingPosition.amount)
              .div(stakingPair.totalSupply)
              .times(stakingPair.reserve0)
              .div(new BigNumber(10).pow(stakingPair.token1.decimals))
              .toString();

            const token1value = new BigNumber(token1balance) //
              .times(stakingPair.reserve1)
              .toNumber();

            return {
              ...stakingPosition,
              stakingToken: plainToClass(LPToken, {
                ...stakingPosition.stakingToken,
                tokens: [
                  {
                    address: stakingPair.token0.id,
                    name: stakingPair.token0.name,
                    symbol: stakingPair.token0.symbol,
                    decimals: stakingPair.token0.decimals,
                    price: stakingPair.token0Price,
                    reserve: stakingPair.reserve0,
                    balance: token0balance,
                    value: token0value,
                  },
                  {
                    address: stakingPair.token1.id,
                    name: stakingPair.token1.name,
                    symbol: stakingPair.token1.symbol,
                    decimals: stakingPair.token1.decimals,
                    price: stakingPair.token1Price,
                    reserve: stakingPair.reserve1,
                    balance: token1balance,
                    value: token1value,
                  },
                ],
              }),
            };
          }),
        );
      }

      return await this.mapper.mapData(
        uniqueAddresses,
        originAddresses,
        {
          uniswapLiquidityPositions,
          sushiswapStakingPosition,
        },
        ProjectEnum.quickswap,
      );
    } catch (error) {
      this.logger.error(error, 'QuickswapService.getDataByAddress');
      throw new Error(error);
    }
  }
}
