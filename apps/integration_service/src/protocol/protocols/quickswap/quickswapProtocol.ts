import { BaseData } from 'apps/integration_service/src/interfaces/transactions.interfaces';
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  IncomeLiquidityPosition,
  Logger,
  PoolTokenDto,
  ProtocolTypeEnum,
} from '@app/common';
import { FeatureEnum } from '@app/common';
import { IntegrationClaimableTokenDto } from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  ProtocolNameEnum,
  QuickswapProtocolEnum,
} from '@app/common/enum';
import { mapToObject } from '@app/common/utils/object';
import { toChunkedArray } from '@app/common/utils/transform';
import { Web3ProviderService } from '@app/common/web3provider';

import {
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
  LPToken,
} from '../../../integrations/integrations.dto';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { PairDto } from '../../../subgraph';
import { QuickswapSubgraph } from '../../../thegraph/quickswap.subgraph';
import { decimalsDivider, getUniqueAndToLowerCaseArrayData } from '../../../utils/util';
import AbstractProtocol from '../abstractProtocol';
import DataProviderProtocol from '../dataProviderProtocol';
import { Mapper } from '../mappers/mapper';
import { MultiCallService } from './multicall.service';
import { QUICKSWAP_STAKING_REWARDS_ABI, QUICKSWAP_STAKING_TOKEN_ABI } from './utils/abi';
import { QUICKSWAP_REWARDS_TOKEN_ADDRESS, QUICKSWAP_STAKING_CONTRACTS } from './utils/constants';

@Injectable()
export class QuickswapProtocol extends DataProviderProtocol implements AbstractProtocol {
  private readonly multicall: MultiCallService;
  readonly chains = [ChainAbbrEnum.plg];
  readonly project = ProjectEnum.quickswap;
  readonly name = QuickswapProtocolEnum.quickswap;
  readonly displayName = 'Quickswap';
  readonly features = {
    [ChainAbbrEnum.plg]: [FeatureEnum.staking],
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

  private async getSubgraphPairs(pairsAddresses: Address[], chunkSize = 10): Promise<PairDto[]> {
    const chunkedPairs = await Promise.all(
      toChunkedArray(pairsAddresses.sort(), chunkSize)
        .map(async (chunkedPairsAddresses): Promise<PairDto[]> => {
          const { data: pairsData, errors: pairsErrors } = await this.subgraph.getPairs(
            chunkedPairsAddresses,
          );
          if (pairsErrors?.length) {
            return [];
          }
          return pairsData.pairs;
        })
        .flat(),
    );

    return chunkedPairs.flat();
  }

  private getLPTokens(
    { token0, token1, reserve0, reserve1, reserveUSD }: PairDto,
    poolShare: number,
  ): PoolTokenDto[] {
    return [0, 1].map((_) => {
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
    });
  }

  public async getData(addresses: string, chain: ChainDto): Promise<BaseData[]> {
    try {
      const originAddresses = addresses.split(',');
      const uniqueAddresses = getUniqueAndToLowerCaseArrayData(originAddresses);

      const liquidityPositionsMap = new Map<Address, IncomeLiquidityPosition[]>();
      const stakingPositionsMap = new Map<Address, IntegrationStakingPositionDto[]>();

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

      for (const userAddress of uniqueAddresses) {
        const stakingTokensBalances = await this.multicall.getBalancesOf(
          QUICKSWAP_STAKING_CONTRACTS.map((_) => _.stakingContractAddress),
          userAddress,
        );

        const stakingTokensClaimable = await this.multicall.getEarned(
          QUICKSWAP_STAKING_CONTRACTS.map((_) => _.stakingContractAddress),
          userAddress,
          QUICKSWAP_STAKING_REWARDS_ABI,
        );

        const lpStakingTokens = await this.multicall.getStakingTokens(
          QUICKSWAP_STAKING_CONTRACTS.map((_) => _.pairAddress),
          QUICKSWAP_STAKING_TOKEN_ABI,
        );

        const stakingPairsData = await this.getSubgraphPairs(
          Object.keys(mapToObject(lpStakingTokens)).flat(),
        );

        const stakingTokens = new Map<string, PairDto>();

        stakingPairsData.forEach((pairData) => {
          stakingTokens.set(pairData.id, pairData);
        });

        const stakingPosition = await Promise.all(
          QUICKSWAP_STAKING_CONTRACTS.map(async ({ pairAddress, stakingContractAddress }) => {
            const pairData = stakingTokens.get(pairAddress);

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

            const poolShare = new BigNumber(balance) //
              .div(pairData.totalSupply)
              .toNumber();

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
              tokens: this.getLPTokens(pairData, poolShare),
            });

            return {
              address: userAddress,
              poolId: null,
              poolName: null,
              staked: balance,
              rewardToken,
              stakingToken,
            };
          }),
        );

        stakingPositionsMap.set(
          userAddress,
          stakingPosition.filter(({ staked }) => +staked),
        );
      }

      return await this.mapper.mapData(
        uniqueAddresses,
        originAddresses,
        {
          subgraphPools: liquidityPositionsMap,
          subgraphStaking: stakingPositionsMap,
        },
        ProjectEnum.quickswap,
        ProtocolNameEnum.quickswap,
        chain,
      );
    } catch (error) {
      this.logger.error(error, 'QuickswapService.getDataByAddress');
      throw error;
    }
  }

  public async getStakingPositionsV2(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const baseData: BaseDataStaking[] = [];

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

    await Promise.all(
      addresses.map(async (userAddress) => {
        const stakingTokensBalances = await this.multicall.getBalancesOf(
          QUICKSWAP_STAKING_CONTRACTS.map(({ stakingContractAddress }) => stakingContractAddress),
          userAddress,
        );

        const stakingTokensClaimable = await this.multicall.getEarned(
          QUICKSWAP_STAKING_CONTRACTS.map(({ stakingContractAddress }) => stakingContractAddress),
          userAddress,
          QUICKSWAP_STAKING_REWARDS_ABI,
        );

        const lpStakingTokens = await this.multicall.getStakingTokens(
          QUICKSWAP_STAKING_CONTRACTS.map(({ pairAddress }) => pairAddress),
          QUICKSWAP_STAKING_TOKEN_ABI,
        );

        const stakingPairsData = await this.getSubgraphPairs(
          Object.keys(mapToObject(lpStakingTokens)).flat(),
        );

        const stakingTokens = new Map<string, PairDto>();

        stakingPairsData.forEach((pairData) => {
          stakingTokens.set(pairData.id, pairData);
        });

        const stakingPositions = await Promise.all(
          QUICKSWAP_STAKING_CONTRACTS.map(
            async ({
              pairAddress,
              stakingContractAddress,
            }): Promise<IntegrationStakingPositionDto> => {
              const pairData = stakingTokens.get(pairAddress);

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

              const poolShare = new BigNumber(balance) //
                .div(pairData.totalSupply)
                .toNumber();

              const rewardToken = plainToClass(IntegrationClaimableTokenDto, {
                address: QUICKSWAP_REWARDS_TOKEN_ADDRESS,
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

              const stakingToken = plainToClass(IntegrationERC20TokenDto, {
                address: pairAddress,
                name: 'Uniswap V2',
                symbol: 'UNI-V2',
                decimals: 18,
                tokens: this.getLPTokens(pairData, poolShare),
              });

              return plainToClass(IntegrationStakingPositionDto, {
                address: null,
                poolId: null,
                poolName: null,
                staked: balance,
                rewardToken,
                stakingToken,
                rewards: [rewardToken],
              });
            },
          ),
        );

        baseData.push(
          plainToClass(BaseDataStaking, {
            chain: chain,
            userAddress,
            items: stakingPositions.filter(({ staked }) => +staked),
            feature: FeatureEnum.staking,
            projectName: ProjectEnum.quickswap,
            protocolType: ProtocolTypeEnum.staking,
          }),
        );
      }),
    );

    return baseData;
  }

  public async getFeatureData(
    addresses: Address[],
    chain: ChainDto,
    feature: FeatureEnum,
  ): Promise<BaseData[]> {
    switch (feature) {
      case FeatureEnum.staking:
        return this.getStakingPositionsV2(addresses, chain);
      case FeatureEnum.pools:
        return [];
      default:
        return [];
    }
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const chainFeatures = await Promise.allSettled(
      this.features[chain.abbr].map((f) => {
        return this.getFeatureData(addresses, chain, f);
      }),
    );

    const data = [];
    const errors = [];
    chainFeatures.forEach((r) => {
      if (r.status === 'fulfilled') {
        data.push(r.value);
      } else {
        this.logger.error(r.reason, r.reason.stack, QuickswapProtocol.name);
        errors.push(r.reason.toString());
      }
    });

    return [data.flat(), errors];
  }
}

export default QuickswapProtocol;
