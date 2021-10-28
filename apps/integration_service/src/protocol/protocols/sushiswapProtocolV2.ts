import BigNumber, { BigNumber as BN } from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AutomaticMarketMaker,
  ChainDto,
  ChainIdEnum,
  Logger,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { toChunkedArray } from '@app/common/utils/transform';
import { Web3ProviderService } from '@app/common/web3provider';

import { ChainAbbrEnum, ProjectEnum, SushiSwapProtocolEnum } from '../../common/enum';

import { BnToFloat } from '../../../../../jobs/pools/src/utils/calc';
import { AssetResponseDto } from '../../../../account_service/src/assets/dto/asset.dto';
import { AccountService } from '../../account/account.service';
import {
  ClaimableDto,
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationStakingPositionDto,
  PoolTokenDto,
} from '../../integrations/integrations.dto';
import { MultiCallService } from '../../multicall';
import {
  MulticallContractFunctionEnum,
  MulticallTokenFunctionEnum,
} from '../../multicall/multicall.enum';
import {
  ContractData,
  ContractDataMap,
  LPTokenData,
  LPTokenDataMap,
  PoolId,
} from '../../multicall/multicall.types';
import { PriceService } from '../../price/price.service';
import { QUICKSWAP_STAKING_TOKEN_ABI } from '../../quickswap/utils/abi';
import { PairDto } from '../../subgraph';
import { SUSHI_CONTRACT_ABI, SUSHI_LP_TOKEN_ABI } from '../../sushiswap/abi';
import { AmmPlgSubgraph } from '../../sushiswap/ammPlgSubgraph';
import { MINI_CHEF_CONTRACT_ADDRESS } from '../../sushiswap/contracts';
import { SushiswapSubgraph } from '../../thegraph/sushiswap.subgraph';
import { objectUpdate } from '../../utils/object';
import { decimalsDivider } from '../../utils/util';
import { FeatureEnum } from '../features/features.enum';
import AbstractProtocol from './abstractProtocol';
import { Mapper } from './mappers/mapper';
import UniswapLikeProtocol from './uniswapLike/uniswapLikeProtocol';

@Injectable()
export class SushiswapProtocolV2 extends UniswapLikeProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.plg];
  readonly project = ProjectEnum.sushiswap;
  readonly name = SushiSwapProtocolEnum.sushiswapV2;
  readonly displayName = 'Sushiswap';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.pools, FeatureEnum.staking],
    [ChainAbbrEnum.plg]: [FeatureEnum.pools],
  };
  public feeRate = 0.003;
  private readonly multicall: MultiCallService;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: SushiswapSubgraph,
    protected readonly mapper: Mapper,
    protected readonly web3Provider: Web3ProviderService,
    private readonly ammPlgSubgraph: AmmPlgSubgraph,
  ) {
    super();
    this.multicall = new MultiCallService(this.web3Provider.getInstanceByChainId(ChainIdEnum.plg));
  }

  // override
  protected getData(addresses: string, chain: ChainDto): Promise<BaseData[]> {
    if (chain.abbr === ChainAbbrEnum.eth) {
      return this.getSubgraphMappedData(addresses, chain);
    } else if (chain.abbr === ChainAbbrEnum.plg) {
      return this.getFeaturesData(addresses, chain);
    }
  }

  async getFeaturesData(addresses: string, chain: ChainDto) {
    const featuresData: BaseData[] = [];
    // TODO: for one address only now
    const userAddress = addresses.toLowerCase();
    const [amm, staking] = await Promise.all([
      this.getPoligonAmmSubgraphData(userAddress, chain),
      this.getMulticallData(userAddress, chain),
    ]);
    featuresData.push(amm, staking);
    return featuresData;
  }

  private async getPoligonAmmSubgraphData(userAddress: Address, chain: ChainDto) {
    const { data: usersData, errors: usersErrors } = await this.ammPlgSubgraph.getUsers([
      userAddress,
    ]);
    if (usersErrors?.length) {
      throw usersErrors[0];
    }
    const { users: usersPools } = usersData;
    const userPoolsData = usersPools?.[0]?.liquidityPositions || [];

    const stakingPairsAddresses = new Set<Address>();
    userPoolsData.forEach(({ pair: { id } }) => stakingPairsAddresses.add(id));

    const liquidityPositionPairs: PairDto[] = await this.getSubgraphPairs(
      Array.from(stakingPairsAddresses),
    );

    const pairsTotalSupply = await this.multicall.getTotalSupply(
      liquidityPositionPairs.map((_) => _.id),
      QUICKSWAP_STAKING_TOKEN_ABI,
    );

    const subgraphPools = await Promise.all(
      liquidityPositionPairs.map((pair) => ({
        liquidityTokenBalance:
          userPoolsData.find(({ pair: { id } }) => id === pair.id).liquidityTokenBalance || null,
        user: userAddress,
        pair: {
          ...pair,
          totalSupply: new BigNumber(pairsTotalSupply.get(pair.id)) //
            .div(decimalsDivider(18))
            .toString(),
        },
      })),
    );

    const baseInfo = {
      chain,
      projectName: this.project,
      protocolName: this.name,
      userAddress,
    };
    const amm: AutomaticMarketMaker = Mapper.transformAmm(baseInfo);
    // TODO: creepy strange logic inside mapper, but what can I do
    await this.mapper.mapLiquidityPositions(amm, subgraphPools || []);

    // TODO: left for future refactoring
    // const liquidityPositions: IncomeLiquidityPosition[];
    // const baseData: BaseData<ProtocolTypeEnum.amm> = {
    //   userAddress,
    //   chain,
    //   protocolType: ProtocolTypeEnum.amm,
    //   projectName: this.project,
    //   protocolName: this.name,
    //   liquidityPositions: liquidityPositions,
    // };
    // return baseData;
    return amm;
  }

  private async getSubgraphPairs(pairsAddresses: Address[], chunkSize = 2): Promise<PairDto[]> {
    const chunkedPairs = await Promise.all(
      toChunkedArray(pairsAddresses, chunkSize)
        .map(async (chunkedPairsAddresses): Promise<PairDto[]> => {
          const { data: pairsData, errors: pairsErrors } = await this.ammPlgSubgraph.getPairs(
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

  private async getMulticallData(
    userAddress: Address,
    chain: ChainDto,
  ): Promise<BaseData<ProtocolTypeEnum.staking>> {
    const { poolLength, rewardTokenAddress } = await this.multicall.getContractBaseData(
      MINI_CHEF_CONTRACT_ADDRESS,
      SUSHI_CONTRACT_ABI,
    );
    const userPoolsInfo: ContractDataMap = await this.multicall.getUserPoolsInfo(
      MINI_CHEF_CONTRACT_ADDRESS,
      SUSHI_CONTRACT_ABI,
      poolLength,
      userAddress,
      [
        MulticallContractFunctionEnum.lpToken,
        MulticallContractFunctionEnum.userInfo,
        MulticallContractFunctionEnum.pendingSushi,
      ],
    );

    const stakingWithBalances: ContractDataMap = new Map();
    // only Pool tokens
    const poolsAddresses: Address[] = [];
    // add Pool tokens
    userPoolsInfo.forEach((data, id) => {
      const {
        lpToken,
        userInfo: { amount },
      } = data;
      if (!amount.isZero()) {
        poolsAddresses.push(lpToken);
        stakingWithBalances.set(id, data);
      }
    });
    // list of Pool + Reward Tokens to get data
    const tokenToFetchInfo = [...poolsAddresses, rewardTokenAddress];
    // fetch all Pool + Reward Tokens data info
    const assetsInfos: AssetResponseDto[] = await Promise.all(
      tokenToFetchInfo.map((address) => this.accountService.getTrackedAssets(address, chain.id)),
    );
    // create Pool and Reward tokens info Map by its Address
    const poolAddressInfoMap: Map<Address, AssetResponseDto> = new Map<Address, AssetResponseDto>();
    assetsInfos.forEach((info, index) => poolAddressInfoMap.set(tokenToFetchInfo[index], info));

    const lpTokensInfo: LPTokenDataMap = await this.multicall.getLpTokenData(
      SUSHI_LP_TOKEN_ABI,
      poolsAddresses,
      [MulticallTokenFunctionEnum.getReserves, MulticallTokenFunctionEnum.totalSupply],
    );

    const stakingPositions: IntegrationStakingPositionDto[] = [];
    stakingWithBalances.forEach((stakingData, poolId) => {
      const poolAddress = stakingData.lpToken;
      const poolSupplyAndReserve = lpTokensInfo.get(poolAddress);
      const poolInfo = poolAddressInfoMap.get(poolAddress);
      const staked = stakingData.userInfo.amount;

      const rewardTokenInfo = poolAddressInfoMap.get(rewardTokenAddress);
      const rewardToken: IntegrationClaimableTokenDto = SushiswapProtocolV2.createRewardToken(
        rewardTokenInfo,
        stakingData,
      );

      const stakingToken: IntegrationERC20TokenDto = SushiswapProtocolV2.createStakingToken(
        poolInfo,
        poolSupplyAndReserve,
        staked,
      );

      const stakingPosition: IntegrationStakingPositionDto =
        SushiswapProtocolV2.createStakingPosition(
          poolInfo,
          stakingToken,
          rewardToken,
          staked,
          poolId,
        );
      stakingPositions.push(stakingPosition);
    });

    const baseData: BaseData<ProtocolTypeEnum.staking> = {
      userAddress,
      chain,
      protocolType: ProtocolTypeEnum.staking,
      projectName: this.project,
      protocolName: this.name,
      stakingPositions: stakingPositions,
    };

    return baseData;
  }

  protected static createStakingToken(
    poolInfo: AssetResponseDto,
    poolSupplyAndReserve: LPTokenData,
    staked,
  ) {
    const userPoolShare = staked.div(poolSupplyAndReserve.totalSupply);
    const poolToken0: PoolTokenDto = SushiswapProtocolV2.createPoolTokenPoolBN(
      poolInfo,
      poolSupplyAndReserve,
      userPoolShare,
      0,
    );
    const poolToken1: PoolTokenDto = SushiswapProtocolV2.createPoolTokenPoolBN(
      poolInfo,
      poolSupplyAndReserve,
      userPoolShare,
      1,
    );

    const stakingToken = plainToClass(IntegrationERC20TokenDto, {});
    stakingToken.address = poolInfo.address;
    stakingToken.name = poolInfo.name;
    stakingToken.symbol = poolInfo.symbol;
    stakingToken.decimals = poolInfo.decimals;
    stakingToken.totalSupply = BnToFloat(
      poolSupplyAndReserve.totalSupply,
      poolInfo.decimals,
    ).toString();
    stakingToken.tokens = [poolToken0, poolToken1];
    stakingToken.balance = BnToFloat(staked, poolInfo.decimals).toString();
    return stakingToken;
  }

  protected static createPoolTokenPoolBN(
    poolInfo: AssetResponseDto,
    poolSupplyAndReserve: LPTokenData,
    userPoolShare: BN,
    order: 0 | 1,
  ): PoolTokenDto {
    const tokenInfo = poolInfo.underlyingAssets.find(
      ({ positionInPool }) => positionInPool === order,
    );
    const poolToken = plainToClass(PoolTokenDto, {});
    objectUpdate(poolToken, tokenInfo, 'difference');
    const reserve = poolSupplyAndReserve[`reserve${order}`] as BN;
    // const balance = userPoolShare.times(reserve).toString();
    // poolToken.balance = balance;
    poolToken.reserve = BnToFloat(reserve, poolToken.decimals).toString();
    return poolToken;
  }

  private static createStakingPosition(
    poolInfo: AssetResponseDto,
    stakingToken: IntegrationERC20TokenDto,
    rewardToken: IntegrationClaimableTokenDto,
    staked: BigNumber,
    poolId: PoolId,
  ): IntegrationStakingPositionDto {
    const stakingPosition = plainToClass(IntegrationStakingPositionDto, {});
    stakingPosition.address = poolInfo.address;
    stakingPosition.poolName = poolInfo.name;
    stakingPosition.staked = staked.toString();
    stakingPosition.stakingToken = stakingToken;
    stakingPosition.rewardToken = rewardToken;
    stakingPosition.poolId = poolId.toString();
    return stakingPosition;
  }

  private static createRewardToken(
    rewardTokenInfo: AssetResponseDto,
    stakingData: ContractData,
  ): IntegrationClaimableTokenDto {
    const claimableData: ClaimableDto = plainToClass(ClaimableDto, {});
    claimableData.balance = stakingData.pending.toString();

    const rewardToken: IntegrationClaimableTokenDto = plainToClass(
      IntegrationClaimableTokenDto,
      rewardTokenInfo,
    );
    rewardToken.claimableData = claimableData;
    return rewardToken;
  }
}

export default SushiswapProtocolV2;
