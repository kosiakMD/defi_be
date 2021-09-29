import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, BalancesResponse, IncomeLiquidityPosition, Logger } from '@app/common';
import { BaseData } from '@app/common/dto/transactions.dto';
import {
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  QuickswapProtocolEnum,
  ProtocolNameEnum,
} from '@app/common/enum';

import { AccountService } from '../../account/account.service';
import { IntegrationClaimableTokenDto, LPToken } from '../../integrations/integrations.dto';
import { Asset } from '../../interfaces/transactions.interfaces';
import { PriceService } from '../../price/price.service';
import { PairDto } from '../../quickswap/dto/subgraph';
import {
  QUICKSWAP_REWARDS_TOKEN_ADDRESS,
  QUICKSWAP_STAKING_CONTRACTS,
} from '../../quickswap/utils/constants';
import { getContractByPair } from '../../quickswap/utils/utils';
import { Web3Service } from '../../quickswap/web3/web3.service';
import { QuickswapSubgraph } from '../../thegraph/quickswap.subgraph';
import { decimalsDivider, getUniqueAndToLowerCaseArrayData } from '../../utils/util';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import DataProviderProtocol from './dataProviderProtocol';
import { Mapper } from './mappers/mapper';

@Injectable()
export class QuickswapProtocol extends DataProviderProtocol implements AbstractProtocol {
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
    private readonly web3: Web3Service,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: QuickswapSubgraph,
    protected readonly mapper: Mapper,
  ) {
    super();
    this.dataProvider = this;
  }

  async getData(addresses: string, chainId: ChainIdEnum): Promise<BaseData[]> {
    try {
      const originAddresses = addresses.split(',');
      const uniqueAddresses = getUniqueAndToLowerCaseArrayData(originAddresses);

      const uniswapLiquidityPositions = new Map<Address, IncomeLiquidityPosition[]>();
      const sushiswapStakingPosition = new Map<Address, any>();

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

        // TODO: under promise.all
        const { data: rewardTokens } = await this.accountService.getAssets(
          [QUICKSWAP_REWARDS_TOKEN_ADDRESS],
          [chainId],
        );

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
        } = await this.subgraph.getPairs([
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
          subgraphPools: uniswapLiquidityPositions,
          subgraphStaking: sushiswapStakingPosition,
        },
        ProjectEnum.quickswap,
        ProtocolNameEnum.quickswap,
        chainId,
      );
    } catch (error) {
      this.logger.error(error, 'QuickswapService.getDataByAddress');
      throw error;
    }
  }

  private mapTokenAddressesFromResponse(
    response: BalancesResponse,
    addresses: Address[],
  ): Record<Address, Address[]> {
    const tokensByAccount = new Map<Address, Address[]>();

    addresses.forEach((address) => {
      const tokens = new Set<Address>();

      response[address]?.tokens.forEach(({ token }) => tokens.add(token.address));

      tokensByAccount.set(address, [...tokens]);
    });

    return Object.fromEntries(tokensByAccount);
  }
}

export default QuickswapProtocol;
