import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

// import web3 from 'web3';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Logger,
  IntegrationFeaturesDataDto,
  FeatureResultDto,
  LendingPositionDto,
  AaveProtocolEnum,
  ChainAbbrEnum,
  ProjectEnum,
  Address,
  ChainDto,
  LendingErcToken,
  IAssetResponseDto,
} from '@app/common';
import { FeatureEnum } from '@app/common';
import { ClaimableDto, IntegrationClaimableTokenDto } from '@app/common';
import { HealthFactorDto } from '@app/common/dto/HealthFactor.dto';
import { normalizeDecimals } from '@app/common/utils/number';
import { Web3ProviderService } from '@app/common/web3provider';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { RAY } from './aave/constants';
import { IReserve } from './aave/interfaces';
import { LocalMultiCall } from './aave/multicall/local.multicall';
import { AaveSubgraph } from './aave/subgraphs/aave.subgraph';
import DataProviderProtocol from './dataProviderProtocol';
import { Mapper } from './mappers/mapper';

@Injectable()
export class AaveProtocolV2 extends DataProviderProtocol {
  readonly chains = [
    ChainAbbrEnum.eth, //
    ChainAbbrEnum.plg,
    ChainAbbrEnum.avax,
  ];
  readonly project = ProjectEnum.aave;
  readonly displayName = 'Aave V2';
  readonly name = AaveProtocolEnum.AaveV2;
  readonly features = {
    [ChainAbbrEnum.eth]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
      FeatureEnum.health,
    ],
    [ChainAbbrEnum.plg]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
      FeatureEnum.health,
    ],
    [ChainAbbrEnum.avax]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
      FeatureEnum.health,
    ],
  };

  protected dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly mapper: Mapper,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly subgraph: AaveSubgraph,
    protected readonly web3Provider: Web3ProviderService,
  ) {
    super();
    this.dataProvider = this;
  }

  async getAllFeaturesData(address: string, chain: ChainDto): Promise<IntegrationFeaturesDataDto> {
    return this.getLendingAndBorrowingData(address.toLowerCase(), chain);
  }

  async getLendingAndBorrowingData(
    address: Address,
    chain: ChainDto,
  ): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    // Get all market data
    const [reserves, rewardToken] = await Promise.all([
      this.getAvailableReserves(chain),
      this.getRewardToken(chain),
    ]);

    // Get user lending and borrowing details
    const [aTokenBalances, sTokenBalances, vTokenBalances] = await Promise.all([
      this.getReservesBalances(this.getATokenAddresses(reserves), address, chain),
      this.getReservesBalances(this.getSTokenAddresses(reserves), address, chain),
      this.getReservesBalances(this.getVTokenAddresses(reserves), address, chain),
    ]);

    // Get prices for all used tokens
    const prices = await this.getAssetPrices(
      reserves,
      aTokenBalances,
      sTokenBalances,
      vTokenBalances,
      rewardToken,
      chain,
    );

    const [lending, borrowing, health, claimable] = await Promise.all([
      this.getLendingDataResponse(reserves, aTokenBalances, prices),
      this.getBorrowingDataResponse(reserves, sTokenBalances, vTokenBalances, prices),
      this.getHealthFactorResponse(address, chain),
      this.getClaimableRewardsResponse(
        [...aTokenBalances.keys(), ...sTokenBalances.keys(), ...vTokenBalances.keys()],
        rewardToken,
        address,
        chain,
        prices,
      ),
    ]);

    response[FeatureEnum.lending] = lending;
    response[FeatureEnum.borrowing] = borrowing;
    response[FeatureEnum.health] = health;
    response[FeatureEnum.claimable] = claimable;

    return response;
  }

  async getAssetPrices(
    reserves: IReserve[],
    aTokenBalances: Map<string, string>,
    sTokenBalances: Map<string, string>,
    vTokenBalances: Map<string, string>,
    reward: IAssetResponseDto,
    chain: ChainDto,
  ): Promise<Map<string, string>> {
    const assets = new Set<string>();
    reserves.forEach((reserve) => {
      if (
        aTokenBalances.has(reserve.aToken.id) ||
        sTokenBalances.has(reserve.sToken.id) ||
        vTokenBalances.has(reserve.vToken.id)
      ) {
        assets.add(reserve.underlyingAsset);
      }
    });

    const { prices } = await this.priceService.getTokenPricesFetch(
      [...assets, reward.address],
      chain.id,
    );

    return new Map(
      Object.entries(prices)
        .filter(([, price]) => price)
        .map(([asset, price]) => [asset.toLowerCase(), price.toString()]),
    );
  }

  async getLendingDataResponse(
    reserves: IReserve[],
    balances: Map<string, string>,
    prices: Map<string, string>,
  ): Promise<FeatureResultDto<LendingPositionDto>> {
    let totalValue = 0;
    const items = reserves.reduce((items, reserve) => {
      if (!balances.has(reserve.aToken.id)) {
        return items;
      }

      const token = plainToClass(LendingErcToken, {
        address: reserve.underlyingAsset.toLowerCase(),
        decimals: reserve.decimals,
        name: reserve.name,
        symbol: reserve.symbol,
        price: prices.get(reserve.underlyingAsset),
      });

      const lendPosition = this.formatLendingToken(
        reserve,
        reserve.liquidityRate.toString(),
        balances.get(reserve.aToken.id),
        token,
      );

      totalValue += lendPosition.value ?? 0;

      return items.concat(lendPosition);
    }, []);

    const lending: FeatureResultDto<LendingPositionDto> = {
      totalValue,
      items,
    };

    return lending;
  }

  async getBorrowingDataResponse(
    reserves: IReserve[],
    sBalances: Map<string, string>,
    vBalances: Map<string, string>,
    prices: Map<string, string>,
  ): Promise<FeatureResultDto<LendingPositionDto>> {
    let totalValue = 0;
    const items = reserves.reduce((items, reserve) => {
      const token = plainToClass(LendingErcToken, {
        address: reserve.underlyingAsset.toLowerCase(),
        decimals: reserve.decimals,
        name: reserve.name,
        symbol: reserve.symbol,
        price: prices.get(reserve.underlyingAsset),
      });

      if (sBalances.has(reserve.sToken.id)) {
        const stablePosition = this.formatLendingToken(
          reserve,
          reserve.stableBorrowRate.toString(),
          sBalances.get(reserve.sToken.id),
          token,
        );
        totalValue += stablePosition.value ?? 0;
        items.push(stablePosition);
      }

      if (vBalances.get(reserve.vToken.id)) {
        const variablePosition = this.formatLendingToken(
          reserve,
          reserve.variableBorrowRate.toString(),
          vBalances.get(reserve.vToken.id),
          token,
        );
        totalValue += variablePosition.value ?? 0;
        items.push(variablePosition);
      }

      return items;
    }, []);

    const borrowing: FeatureResultDto<LendingPositionDto> = {
      totalValue,
      items,
    };

    return borrowing;
  }

  async getHealthFactorResponse(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<HealthFactorDto>> {
    const userAccountData = await this.getUserAccountData(address, chain);

    // Full health is too large so we set the maximum supported value here
    // 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
    const MAX_HEALTH = 100;

    return plainToClass(FeatureResultDto, {
      totalValue: 0,
      items: [
        {
          healthFactor: BigNumber.minimum(
            normalizeDecimals(userAccountData.healthFactor.toString(), 18),
            MAX_HEALTH,
          ).toNumber(),
        },
      ],
    });
  }

  async getClaimableRewardsResponse(
    assets: Address[],
    token: IAssetResponseDto,
    address: Address,
    chain: ChainDto,
    prices: Map<string, string>,
  ): Promise<FeatureResultDto<IntegrationClaimableTokenDto>> {
    const claimableRewardsRaw = await this.getRewardsBalance(address, assets, chain);

    const claimableRewards = normalizeDecimals(claimableRewardsRaw, token.decimals);

    if (!claimableRewards) {
      return plainToClass(FeatureResultDto, {
        totalValue: 0,
        items: [],
      });
    }

    const claimableToken = plainToClass(IntegrationClaimableTokenDto, {
      price: Number(prices.get(token.address)),
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      decimals: token.decimals,
      claimableData: plainToClass(ClaimableDto, {
        balance: claimableRewards,
        value: new BigNumber(claimableRewards) //
          .multipliedBy(prices.get(token.address))
          .toNumber(),
      }),
    });

    return plainToClass(FeatureResultDto, {
      totalValue: claimableToken.claimableData.value,
      items: [claimableToken],
    });
  }

  // data helpers
  getReserveTokenAddresses(reserve: IReserve): Address[] {
    return [reserve.aToken.id, reserve.sToken.id, reserve.vToken.id];
  }

  getATokenAddresses(reserves: IReserve[]): Address[] {
    return reserves.map((reserve) => reserve.aToken.id);
  }

  getSTokenAddresses(reserves: IReserve[]): Address[] {
    return reserves.map((reserve) => reserve.sToken.id);
  }

  getVTokenAddresses(reserves: IReserve[]): Address[] {
    return reserves.map((reserve) => reserve.vToken.id);
  }

  formatLendingToken(reserve: IReserve, apy: string, balance: string, token: LendingErcToken) {
    return plainToClass(LendingPositionDto, {
      address: reserve.id,
      balance: normalizeDecimals(balance, token.decimals),
      value: new BigNumber(balance) //
        .dividedBy(new BigNumber(10).pow(token.decimals))
        .multipliedBy(token.price)
        .toNumber(),
      APY: new BigNumber(apy) //
        .dividedBy(RAY)
        .multipliedBy(100)
        .toNumber(),
      token,
    });
  }

  async getRewardToken(chain: ChainDto) {
    const REWARD_TOKEN = await this.getMulticall(chain).getRewardToken(chain);
    return this.accountService.getTrackedAssets(REWARD_TOKEN, chain.id);
  }

  getReservesBalances(
    assets: Address[],
    address: Address,
    chain: ChainDto,
  ): Promise<Map<string, string>> {
    return this.getMulticall(chain).getNotEmptyBalancesOf(assets, address);
  }

  getAvailableReserves(chain: ChainDto): Promise<IReserve[]> {
    return this.subgraph.getReserves(chain);
  }
  getUserAccountData(address: Address, chain: ChainDto) {
    return this.getMulticall(chain).getUserAccountData(address, chain);
  }
  getRewardsBalance(address: Address, assets: Address[], chain: ChainDto) {
    return this.getMulticall(chain).getRewardsBalance(address, assets, chain);
  }

  getMulticall(chain: ChainDto) {
    const webProvider = this.web3Provider.getInstanceByChainId(chain.id);
    return new LocalMultiCall(webProvider, this.logger);
  }
}
export default AaveProtocolV2;
