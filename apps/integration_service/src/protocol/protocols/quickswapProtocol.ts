import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, IncomeLiquidityPosition, Logger, PoolTokenDto } from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import {
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  QuickswapProtocolEnum,
  ProtocolNameEnum,
} from '@app/common/enum';
import { MultiCallService } from '@app/common/multicall';
import { Web3ProviderService } from '@app/common/web3provider';

import { AccountService } from '../../account/account.service';
import {
  IntegrationClaimableTokenDto,
  IntegrationStakingPositionDto,
  LPToken,
} from '../../integrations/integrations.dto';
import { PriceService } from '../../price/price.service';
import { PairDto } from '../../quickswap/dto/subgraph';
import { LPTokenPair } from '../../quickswap/interfaces';
import {
  QUICKSWAP_STAKING_REWARDS_ABI,
  QUICKSWAP_STAKING_TOKEN_ABI,
} from '../../quickswap/utils/abi';
import {
  QUICKSWAP_REWARDS_TOKEN_ADDRESS,
  QUICKSWAP_STAKING_CONTRACTS,
} from '../../quickswap/utils/constants';
import { QuickswapSubgraph } from '../../thegraph/quickswap.subgraph';
import { decimalsDivider, getUniqueAndToLowerCaseArrayData } from '../../utils/util';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import DataProviderProtocol from './dataProviderProtocol';
import { Mapper } from './mappers/mapper';

@Injectable()
export class QuickswapProtocol extends DataProviderProtocol implements AbstractProtocol {
  private readonly multicall: MultiCallService;

  readonly chains = [ChainAbbrEnum.plg];
  readonly project = ProjectEnum.quickswap;
  readonly name = QuickswapProtocolEnum.quickswap;
  readonly displayName = 'Quickswap';
  readonly features = {
    [ChainAbbrEnum.plg]: [FeatureEnum.pools, FeatureEnum.staking],
  };
  protected dataProvider;
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: QuickswapSubgraph,
    protected readonly mapper: Mapper,
    protected readonly web3Provider: Web3ProviderService,
  ) {
    super();
    this.dataProvider = this;
    this.multicall = new MultiCallService(this.web3Provider.getInstanceByChainId(ChainIdEnum.plg));
  }

  private async getLPTokens(
    { token0, token1, reserve0, reserve1, reserveUSD }: PairDto,
    poolShare: number,
  ): Promise<PoolTokenDto[]> {
    return await Promise.all(
      [0, 1].map(async (_) => {
        const { id: address, name, symbol, decimals } = _ ? token1 : token0;
        const reserve = _ ? reserve1 : reserve0;
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
      }),
    );
  }

  public async getData(addresses: string): Promise<BaseData[]> {
    try {
      const originAddresses = addresses.split(',');
      const uniqueAddresses = getUniqueAndToLowerCaseArrayData(originAddresses);

      const uniswapLiquidityPositions = new Map<Address, IncomeLiquidityPosition[]>();
      const sushiswapStakingPosition = new Map<Address, IntegrationStakingPositionDto[]>();

      const { data: rawRewardTokens } = await this.accountService.getAssets(
        [QUICKSWAP_REWARDS_TOKEN_ADDRESS],
        [ChainIdEnum.plg],
      );
      const rawRewardToken = rawRewardTokens[0];

      const { prices } = await this.priceService.getTokenPricesFetch(
        [rawRewardToken.address],
        ChainIdEnum.plg,
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

        const pairsTotalSupply = await this.multicall.getTotalSupply(
          liquidityPositionPairs.map((_) => _.id),
          QUICKSWAP_STAKING_TOKEN_ABI,
        );

        const pairs = await Promise.all(
          liquidityPositionPairs.map((pair) => ({
            liquidityTokenBalance:
              userLiquidityPositions.liquidityPositions.find(({ pair: { id } }) => id === pair.id)
                .liquidityTokenBalance || null,
            user: address,
            pair: {
              ...pair,
              totalSupply: new BigNumber(pairsTotalSupply.get(pair.id)) //
                .div(decimalsDivider(18))
                .toString(),
            },
          })),
        );
        uniswapLiquidityPositions.set(address, pairs);

        const stakingTokensBalances = await this.multicall.getBalancesOf(
          QUICKSWAP_STAKING_CONTRACTS.map((_) => _.stakingContractAddress),
          address,
        );

        const stakingTokensClaimable = await this.multicall.getEarned(
          QUICKSWAP_STAKING_CONTRACTS.map((_) => _.stakingContractAddress),
          address,
          QUICKSWAP_STAKING_REWARDS_ABI,
        );

        const lpStakingTokens = await this.multicall.getStakingTokens(
          QUICKSWAP_STAKING_CONTRACTS.map((_) => _.pairAddress),
          QUICKSWAP_STAKING_TOKEN_ABI,
        );

        const stakingPosition = await Promise.all(
          QUICKSWAP_STAKING_CONTRACTS.map(async ({ pairAddress, stakingContractAddress }) => {
            const balance = new BigNumber(
              stakingTokensBalances.get(stakingContractAddress.toLocaleLowerCase()),
            )
              .div(decimalsDivider(rawRewardToken.decimals))
              .toString();
            const claimable = stakingTokensClaimable.get(
              stakingContractAddress.toLocaleLowerCase(),
            );

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

            lpStakingTokens.get(pairAddress.toLocaleLowerCase()).forEach((tokenAddress) =>
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
          subgraphPools: uniswapLiquidityPositions,
          subgraphStaking: sushiswapStakingPosition,
        },
        ProjectEnum.quickswap,
        ProtocolNameEnum.quickswap,
        ChainIdEnum.plg,
      );
    } catch (error) {
      this.logger.error(error, 'QuickswapService.getDataByAddress');
      throw error;
    }
  }
}

export default QuickswapProtocol;
