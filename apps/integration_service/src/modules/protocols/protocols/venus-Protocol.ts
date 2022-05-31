import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ClaimableDto,
  FeatureEnum,
  FeatureResultDto,
  IAssetResponseDto,
  IntegrationClaimableTokenDto,
  IntegrationFeaturesDataDto,
  LendingErcToken,
  LendingPositionDto,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
  VenusProtocolEnum,
} from '@app/common';
import { BaseDataClaimable } from '@app/common/dto/base.data.claimable.dto';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import { CallData } from '@app/common/dto/call-data';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { IntegrationERC20TokenDto, IntegrationStakingPositionDto } from '@app/common/jobs/staking';
import { concatStrings } from '@app/common/utils';
import { normalizeDecimals } from '@app/common/utils/number';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { BaseData } from '../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { Mapper } from '../helpers/mappers/mapper';
import DataProviderProtocol from './data-provider-protocol';
import { OracleAbis } from './venus/contracts/oracle';
import { PoolAbis } from './venus/contracts/pool';
import { TokenAbis } from './venus/contracts/token';
import { UnitrollerAbis } from './venus/contracts/unitroller';
import { VTokenAbis } from './venus/contracts/vToken';
import { venusAddresses } from './venus/venus.constants';
import { APY, BalanceInfo } from './venus/venus.interfaces';

@Injectable()
export class VenusProtocol extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.bnb];
  readonly project = ProjectEnum.venus;
  readonly displayName = 'Venus';
  readonly name = VenusProtocolEnum.venus;
  readonly features = {
    [ChainAbbrEnum.bnb]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.staking,
      FeatureEnum.claimable,
    ],
  };

  protected dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly mapper: Mapper,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly web3Provider: Web3ProviderService,
    protected readonly multicallService: MulticallAggregator,
  ) {
    super();
    this.dataProvider = this;
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    const userData = await Promise.allSettled(
      addresses.flatMap((address) => {
        return this.getAsBaseData(address, chain);
      }),
    );

    const [data, errors] = handlePromiseAllSettled(userData);

    return [data.flat(), errors];
  }

  async getAsBaseData(address: Address, chain: ChainDto): Promise<BaseData[]> {
    const featureData = await this.getAllFeaturesData(address, chain);

    const factory = this.createBaseObjectFactory(
      address,
      chain,
      featureData,
      ProjectEnum.venus,
      VenusProtocolEnum.venus,
    );
    const lending = plainToClass(
      BaseDataLending,
      factory(ProtocolTypeEnum.lending, FeatureEnum.lending),
    );
    const borrowing = plainToClass(
      BaseDataLending,
      factory(ProtocolTypeEnum.borrowing, FeatureEnum.borrowing),
    );
    const staking = plainToClass(
      BaseDataStaking,
      factory(ProtocolTypeEnum.staking, FeatureEnum.staking),
    );
    const claimable = plainToClass(
      BaseDataClaimable,
      factory(ProtocolTypeEnum.lending, FeatureEnum.claimable),
    );

    return [lending, borrowing, staking, claimable];
  }

  createBaseObjectFactory(
    address: Address,
    chain: ChainDto,
    featureData: IntegrationFeaturesDataDto,
    projectName: ProjectEnum,
    protocolName: VenusProtocolEnum,
  ) {
    return function (protocolType: ProtocolTypeEnum, feature: FeatureEnum) {
      return {
        chain,
        userAddress: address,
        protocolType,
        projectName,
        protocolName,
        total: featureData[feature].totalValue,
        feature,
        items: featureData[feature].items,
      };
    };
  }

  async getAllFeaturesData(address: Address, chain: ChainDto): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    const [lending, borrowing] = await this.getLendingAndBorrowingData(
      address.toLowerCase(),
      chain,
    );
    const staking = await this.getStakingData(address.toLowerCase(), chain);
    const claimable = await this.getClaimableData(address.toLowerCase(), chain);

    response[FeatureEnum.lending] = lending;
    response[FeatureEnum.borrowing] = borrowing;
    response[FeatureEnum.staking] = staking;
    response[FeatureEnum.claimable] = claimable;

    return response;
  }

  async getStakingData(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationStakingPositionDto>> {
    const stakingToken = await this.getToken(venusAddresses.VAI, chain);
    const rewardToken = await this.getToken(venusAddresses.XVS, chain);

    const prices = await this.getAssetPrices([stakingToken.address, rewardToken.address], chain);

    const dataFromPool = await this.callsForPool(address, chain);
    const amount = dataFromPool.get(this.userInfoLabel(address)).output.data.amount; // amount of VAI tokens
    const rewardsAmount = dataFromPool.get(this.pendingXVSLabel(address)).output.data; // amount of XVS tokens
    const tvl = normalizeDecimals(
      dataFromPool.get(this.balanceOfLabel(venusAddresses.VAIPool)).output.data.toString(),
      stakingToken.decimals,
    );

    const items = [];
    const totalValue = 0;
    if (amount > 0) {
      const rewardPosition = plainToClass(IntegrationClaimableTokenDto, {
        address: rewardToken.address,
        decimals: rewardToken.decimals,
        name: rewardToken.name,
        symbol: rewardToken.symbol,
        claimableData: plainToClass(ClaimableDto, {}),
      });

      rewardPosition.claimableData.balance = normalizeDecimals(
        rewardsAmount,
        rewardToken.decimals,
      ).toString();

      const stakingTokenPosition = plainToClass(IntegrationERC20TokenDto, {
        address: stakingToken.address,
        decimals: stakingToken.decimals,
        name: stakingToken.name,
        symbol: stakingToken.symbol,
        price: prices.get(stakingToken.address.toLowerCase()),
        balance: normalizeDecimals(amount.toString(), stakingToken.decimals),
      });

      stakingTokenPosition.value = stakingTokenPosition.balance * stakingTokenPosition.price;

      const stakingPosition = plainToClass(IntegrationStakingPositionDto, {
        address: stakingToken.address,
        staked: amount,
        stakingToken: stakingTokenPosition,
        rewards: [rewardPosition],
      });

      stakingPosition.stats.tvl = tvl * stakingTokenPosition.price;
      items.push(stakingPosition);
    }

    const staking: FeatureResultDto<IntegrationStakingPositionDto> = {
      totalValue,
      items,
    };

    return staking;
  }

  async getClaimableData(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationClaimableTokenDto>> {
    const claimableToken = await this.getToken(venusAddresses.XVS.toLowerCase(), chain);
    const claimableTokenBalance = await this.getAccruedVenusBalance(address, chain);

    const prices = await this.getAssetPrices([claimableToken.address], chain);

    const claimablePosition = this.formatClaimableToken(
      claimableToken,
      prices,
      claimableTokenBalance.toString(),
    );

    const claimable: FeatureResultDto<IntegrationClaimableTokenDto> = {
      totalValue: claimablePosition.claimableData.value,
      items: [claimablePosition],
    };

    return claimable;
  }

  async getLendingAndBorrowingData(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<LendingPositionDto>[]> {
    const vTokens = await this.getVTokenList(chain); // get the up-to-date list of vTokens
    const rewardToken = await this.getToken(venusAddresses.XVS.toLowerCase(), chain);

    const batchCall: Map<string, CallData> = await this.callsForVToken(vTokens, address, chain);

    const underlyingTokens = new Map<string, string>(); // stores vToken and its underlying token addresses
    const balances: BalanceInfo[] =
      vTokens.map((vTokenAddress) => {
        const underlyingTokenAddress =
          batchCall
            .get(this.getUnderlyingLabel(vTokenAddress, address))
            ?.output.data.toString()
            .toLowerCase() ?? venusAddresses.BNB;
        underlyingTokens.set(vTokenAddress, underlyingTokenAddress);

        const balanceOfToken = batchCall.get(
          this.getBalanceOfUnderlyingLabel(vTokenAddress, address),
        ).output.data; // the amount of tokens which the user has
        const borrowBalance = batchCall.get(this.getBorrowBalanceLabel(vTokenAddress, address))
          .output.data; // the amount of borrowed tokens
        const balanceOfVToken = batchCall.get(this.getBalanceOfLabel(vTokenAddress, address)).output
          .data; // the amount of vToken which the user has
        const vTokenExchangeRate = batchCall.get(this.getExchangeRateLabel(vTokenAddress)).output
          .data;
        const vTokenSupplyRate = batchCall.get(this.getSupplyRateLabel(vTokenAddress)).output.data;
        const vTokenBorrowRate = batchCall.get(this.getBorrowRateLabel(vTokenAddress)).output.data;

        const vTokenStats = {
          exchangeRate: vTokenExchangeRate,
          supplyRate: vTokenSupplyRate,
          borrowRate: vTokenBorrowRate,
        };

        return {
          userAddress: address,
          vToken: vTokenAddress,
          vTokenBalance: balanceOfVToken,
          token: underlyingTokens.get(vTokenAddress),
          tokenBalance: balanceOfToken,
          borrowBalance,
          vTokenStats,
        };
      }) || [];

    const venusAPY: Map<string, APY> = await this.calcVenusAPY(vTokens, underlyingTokens, chain); // calculate Venus (XVS) APY for all vTokens

    // Get prices for all used tokens
    const prices = await this.getAssetPrices(
      [...Array.from(underlyingTokens.values()), rewardToken.address, venusAddresses.VAI],
      chain,
    );

    const mintedVAIs = await this.getVAIBalance(address, chain); // user amount of minted VAI

    const [lending, borrowing] = await Promise.all([
      this.getLendingDataResponse(balances, prices, venusAPY, chain),
      this.getBorrowingDataResponse(balances, mintedVAIs, prices, venusAPY, chain),
    ]);

    return [lending, borrowing];
  }

  async getAssetPrices(tokens: string[], chain: ChainDto): Promise<Map<string, string>> {
    const assets = new Set<string>(tokens.map((token) => token.toLowerCase()));

    const { prices } = await this.priceService.getTokenPricesFetch([...assets], chain.id);

    return new Map(
      Object.entries(prices)
        .filter(([, price]) => price)
        .map(([asset, price]) => [asset.toLowerCase(), price.toString()]),
    );
  }

  async getLendingDataResponse(
    balances: any[],
    prices: Map<string, string>,
    venusAPY: Map<string, APY>,
    chain: ChainDto,
  ): Promise<FeatureResultDto<LendingPositionDto>> {
    let totalValue = 0;
    const items = [];
    await Promise.all(
      balances.map(async (b) => {
        if (b.tokenBalance > 0) {
          const tokenData = await this.getToken(b.token, chain);
          const vTokenData = await this.getToken(b.vToken, chain);

          const token = plainToClass(LendingErcToken, {
            address: b.token.toLowerCase(),
            decimals: tokenData.decimals,
            name: tokenData.name,
            symbol: tokenData.symbol,
            price: prices.get(b.token.toLowerCase()),
          });

          const tokenBalance = this.calcTokenBalance(
            b.vTokenBalance,
            b.vTokenStats.exchangeRate,
            vTokenData.decimals,
          ).toString();
          const positionAPY =
            this.calcAPY(b.vTokenStats.supplyRate) + venusAPY.get(b.vToken.toLowerCase()).supply;

          const lendPosition = this.formatLendingToken(
            b.vToken.toLowerCase(),
            positionAPY,
            tokenBalance,
            token,
          );

          totalValue += lendPosition.value ?? 0;

          items.push(lendPosition);
        }
      }),
    );

    const lending: FeatureResultDto<LendingPositionDto> = {
      totalValue,
      items,
    };

    return lending;
  }

  async getBorrowingDataResponse(
    balances: any[],
    mintedVAIs: BigNumber,
    prices: Map<string, string>,
    venusAPY: Map<string, APY>,
    chain: ChainDto,
  ): Promise<FeatureResultDto<LendingPositionDto>> {
    let totalValue = 0;
    const items = [];

    await Promise.all(
      balances.map(async (b) => {
        if (b.borrowBalance > 0) {
          const tokenData = await this.getToken(b.token, chain);

          const token = plainToClass(LendingErcToken, {
            address: b.token.toLowerCase(),
            decimals: tokenData.decimals,
            name: tokenData.name,
            symbol: tokenData.symbol,
            price: Number(prices.get(b.token.toLowerCase())),
          });

          const positionAPY =
            -1 * this.calcAPY(b.vTokenStats.borrowRate) +
            venusAPY.get(b.vToken.toLowerCase()).borrow; // token APY plus XVS APY

          const borrowPosition = this.formatLendingToken(
            b.vToken,
            positionAPY,
            b.borrowBalance,
            token,
          );

          totalValue += borrowPosition.value ?? 0;

          items.push(borrowPosition);
        }
      }),
    );

    // add VAI position
    if (mintedVAIs.toNumber() > 0) {
      const VAIData = await this.getToken(venusAddresses.VAI, chain);
      const token = plainToClass(LendingErcToken, {
        address: VAIData.address.toLowerCase(),
        decimals: VAIData.decimals,
        name: VAIData.name,
        symbol: VAIData.symbol,
        price: prices.get(VAIData.address.toLowerCase()),
      });

      const borrowPosition = this.formatLendingToken(
        VAIData.address.toLowerCase(),
        this.calcAPY(0),
        mintedVAIs.toString(),
        token,
      );
      items.push(borrowPosition);
    }

    const borrowing: FeatureResultDto<LendingPositionDto> = {
      totalValue,
      items,
    };

    return borrowing;
  }

  formatLendingToken(address: string, apy: number, balance: string, token: LendingErcToken) {
    return plainToClass(LendingPositionDto, {
      address,
      balance: normalizeDecimals(balance, token.decimals),
      value: new BigNumber(balance) //
        .dividedBy(new BigNumber(10).pow(token.decimals))
        .multipliedBy(token.price)
        .toNumber(),
      apy: new BigNumber(apy) //
        .toNumber(),
      token,
    });
  }

  formatClaimableToken(token: IAssetResponseDto, prices: Map<string, string>, balance: string) {
    return plainToClass(IntegrationClaimableTokenDto, {
      address: token.address.toLowerCase(),
      decimals: token.decimals,
      name: token.name,
      symbol: token.symbol,
      price: prices.get(token.address.toLowerCase()),
      claimableData: plainToClass(ClaimableDto, {
        balance: normalizeDecimals(balance, token.decimals),
        value: new BigNumber(balance) //
          .dividedBy(new BigNumber(10).pow(token.decimals))
          .multipliedBy(prices.get(token.address.toLowerCase()))
          .toNumber(),
      }),
    });
  }

  async getToken(address: string, chain: ChainDto) {
    return this.accountService.getTrackedAssets(address, chain.id);
  }

  async getVTokenList(chain: ChainDto): Promise<string[]> {
    const unitrollerContract = new UnitrollerAbis(venusAddresses.unitroller);

    const call: Map<string, CallData> = new Map<string, CallData>([
      [this.getVTokenListLabel(venusAddresses.unitroller), unitrollerContract.getAllMarkets()],
    ]);

    const getVTokensCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      chain.id,
    );

    const vTokenList = getVTokensCall.get(this.getVTokenListLabel(venusAddresses.unitroller)).output
      .data;
    return vTokenList;
  }

  calcTokenBalance(
    vTokenBalance: number,
    exchangeRateCurrent: BigNumber,
    underlyingDecimals: number,
  ) {
    const mantissa = 18 + underlyingDecimals - 8;
    const onevTokenInUnderlying = exchangeRateCurrent.div(Math.pow(10, mantissa));
    return new BigNumber(vTokenBalance)
      .multipliedBy(onevTokenInUnderlying) //
      .toNumber();
  }

  calcAPY(ratePerBlock: number): number {
    const bnbMantissa = 1e18;
    const blocksPerDay = 20 * 60 * 24;
    const daysPerYear = 365;

    const apy = (Math.pow((ratePerBlock / bnbMantissa) * blocksPerDay + 1, daysPerYear) - 1) * 100;
    return apy;
  }

  async calcVenusAPY(
    tokens: string[],
    underlyingTokens: Map<string, string>,
    chain: ChainDto,
  ): Promise<Map<string, APY>> {
    const totalSupplyAndBorrows = await this.getTotalSupplyAndBorrows(tokens, chain);
    const venusSpeeds = await this.getVenusSpeeds(tokens, chain);
    const venusAPY = new Map<string, APY>();

    const prices = await this.getPricesFromOracle(tokens, chain);

    const venusPrice = normalizeDecimals(
      prices.get(venusAddresses.vXVS.toLowerCase()).toString(),
      18,
    );

    await Promise.all(
      tokens.map(async (vTokenAddress) => {
        const underlyingToken = await this.getToken(underlyingTokens.get(vTokenAddress), chain);
        const underlyingTokenPrice = normalizeDecimals(
          prices.get(vTokenAddress.toLowerCase()).toString(),
          underlyingToken.decimals,
        );

        // Total supply needs to be converted from vTokens
        const mantissa = 18 + underlyingToken.decimals - 8;

        const exchangeRate = normalizeDecimals(
          totalSupplyAndBorrows
            .get(this.getExchangeRateLabel(vTokenAddress))
            .output.data.toNumber(),
          mantissa,
        );

        const totalBorrows = normalizeDecimals(
          totalSupplyAndBorrows
            .get(this.getTotalBorrowsLabel(vTokenAddress))
            .output.data.toString(),
          underlyingToken.decimals,
        );
        const totalSupply = normalizeDecimals(
          (
            totalSupplyAndBorrows
              .get(this.getTotalSupplyLabel(vTokenAddress))
              .output.data.toNumber() * exchangeRate
          ).toString(),
          8,
        );

        const apxBlockSpeedInSeconds = 3;
        const blocksPerDay = (60 * 60 * 24) / apxBlockSpeedInSeconds;
        const venusSpeed = venusSpeeds.get(vTokenAddress).output.data / 1e18;
        const venusPerDay = venusSpeed * blocksPerDay;

        const venusBorrowApy = this.apyFormula(
          venusPrice,
          venusPerDay,
          totalBorrows,
          underlyingTokenPrice,
        );
        const venusSupplyApy = this.apyFormula(
          venusPrice,
          venusPerDay,
          totalSupply,
          underlyingTokenPrice,
        );

        venusAPY.set(vTokenAddress.toLowerCase(), {
          borrow: venusBorrowApy.toNumber(),
          supply: venusSupplyApy.toNumber(),
        });
      }),
    );

    return venusAPY;
  }

  private apyFormula(
    venusPrice: number,
    venusPerDay: number,
    total: number,
    underlyingTokenPrice: number,
  ) {
    return new BigNumber(venusPrice)
      .multipliedBy(venusPerDay) //
      .div(total)
      .div(underlyingTokenPrice)
      .plus(1)
      .pow(365)
      .minus(1)
      .multipliedBy(100);
  }

  async getPricesFromOracle(tokens: string[], chain: ChainDto): Promise<Map<string, BigNumber>> {
    const oracleContract = new OracleAbis(venusAddresses.oracle);
    const prices = new Map<string, BigNumber>();

    const calls: Map<string, CallData> = new Map<string, CallData>(
      tokens.map((t) => [t.toLowerCase(), oracleContract.getUnderlyingPrice(t)]),
    );

    const pricesCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      calls,
      chain.id,
    );

    pricesCall.forEach((callData, address) => {
      prices.set(address, new BigNumber(callData.output.data));
    });

    return prices;
  }

  async getVenusSpeeds(tokens: string[], chain: ChainDto): Promise<Map<string, CallData>> {
    const unitrollerContract = new UnitrollerAbis(venusAddresses.unitroller);

    const call: Map<string, CallData> = new Map<string, CallData>(
      tokens.map((t) => [t, unitrollerContract.venusSpeeds(t)]),
    );

    const venusSpeedsCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      chain.id,
    );

    return venusSpeedsCall;
  }

  async getTotalSupplyAndBorrows(vTokens: string[], chain: ChainDto) {
    const calls = new Map<string, CallData>();
    vTokens.forEach((vTokenAddress) => {
      const vTokenContract = new VTokenAbis(vTokenAddress);

      calls.set(this.getTotalBorrowsLabel(vTokenAddress), vTokenContract.totalBorrowsCurrent());
      calls.set(this.getTotalSupplyLabel(vTokenAddress), vTokenContract.totalSupply());
      calls.set(this.getExchangeRateLabel(vTokenAddress), vTokenContract.exchangeRateCurrent());
    });

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      calls,
      chain.id,
    );

    return batchCall;
  }

  async getVAIBalance(userAddress: string, chain: ChainDto): Promise<BigNumber> {
    const unitrollerContract = new UnitrollerAbis(venusAddresses.unitroller);

    const call: Map<string, CallData> = new Map<string, CallData>([
      [this.mintedVAIsLabel(userAddress), unitrollerContract.mintedVAIs(userAddress)],
    ]);

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      chain.id,
    );

    return batchCall.get(this.mintedVAIsLabel(userAddress)).output.data;
  }

  async getAccruedVenusBalance(userAddress: string, chain: ChainDto): Promise<BigNumber> {
    const unitrollerContract = new UnitrollerAbis(venusAddresses.unitroller);

    const call: Map<string, CallData> = new Map<string, CallData>([
      [this.venusAccruedLabel(userAddress), unitrollerContract.venusAccrued(userAddress)],
    ]);

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      chain.id,
    );

    return batchCall.get(this.venusAccruedLabel(userAddress)).output.data;
  }

  async callsForPool(userAddress: string, chain: ChainDto): Promise<Map<string, CallData>> {
    const poolContract = new PoolAbis(venusAddresses.VAIPool);
    const vaiContract = new TokenAbis(venusAddresses.VAI);

    const calls: Map<string, CallData> = new Map<string, CallData>([
      [this.pendingXVSLabel(userAddress), poolContract.pendingXVS(userAddress)],
      [this.userInfoLabel(userAddress), poolContract.userInfo(userAddress)],
      [this.balanceOfLabel(venusAddresses.VAIPool), vaiContract.balanceOf(venusAddresses.VAIPool)],
    ]);

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      calls,
      chain.id,
    );

    return batchCall;
  }

  async callsForVToken(
    vTokens: string[],
    address: string,
    chain: ChainDto,
  ): Promise<Map<string, CallData>> {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    vTokens.forEach((vTokenAddress) => {
      const vTokenContract = new VTokenAbis(vTokenAddress);
      calls.set(
        this.getBalanceOfUnderlyingLabel(vTokenAddress, address),
        vTokenContract.balanceOfUnderlying(address),
      );
      calls.set(this.getBalanceOfLabel(vTokenAddress, address), vTokenContract.balanceOf(address));
      calls.set(
        this.getBorrowBalanceLabel(vTokenAddress, address),
        vTokenContract.borrowBalanceCurrent(address),
      );
      calls.set(this.getExchangeRateLabel(vTokenAddress), vTokenContract.exchangeRateCurrent());
      calls.set(this.getBorrowRateLabel(vTokenAddress), vTokenContract.borrowRatePerBlock());
      calls.set(this.getSupplyRateLabel(vTokenAddress), vTokenContract.supplyRatePerBlock());

      if (vTokenAddress !== venusAddresses.vBNB) {
        calls.set(this.getUnderlyingLabel(vTokenAddress, address), vTokenContract.underlying());
      }
    });

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      calls,
      chain.id,
    );

    return batchCall;
  }

  getBalanceOfUnderlyingLabel(contract: string, address: string): string {
    return concatStrings(VTokenAbis.balanceOfUnderlying.name, contract, address);
  }

  getBalanceOfLabel(contract: string, address: string): string {
    return concatStrings(VTokenAbis.balanceOf.name, contract, address);
  }

  getUnderlyingLabel(contract: string, address: string): string {
    return concatStrings(VTokenAbis.underlying.name, contract, address);
  }

  getBorrowBalanceLabel(contract: string, address: string): string {
    return concatStrings(VTokenAbis.borrowBalanceCurrent.name, contract, address);
  }

  getVTokenListLabel(contract: string): string {
    return concatStrings(UnitrollerAbis.getAllMarkets.name, contract);
  }

  getExchangeRateLabel(vTokenAddress: string): string {
    return concatStrings(VTokenAbis.exchangeRateCurrent.name, vTokenAddress);
  }

  getBorrowRateLabel(vTokenAddress: string): string {
    return concatStrings(VTokenAbis.borrowRatePerBlock.name, vTokenAddress);
  }

  getSupplyRateLabel(vTokenAddress: string): string {
    return concatStrings(VTokenAbis.supplyRatePerBlock.name, vTokenAddress);
  }

  getTotalBorrowsLabel(vTokenAddress: string): string {
    return concatStrings(VTokenAbis.totalBorrowsCurrent.name, vTokenAddress);
  }

  getTotalSupplyLabel(vTokenAddress: string): string {
    return concatStrings(VTokenAbis.totalSupply.name, vTokenAddress);
  }

  vTokenVenusSpeedLabel(unitroller: string, tokenAddress: string): string {
    return concatStrings(UnitrollerAbis.venusSpeeds.name, unitroller, tokenAddress);
  }

  pendingXVSLabel(userAddress: string): string {
    return concatStrings(PoolAbis.pendingXVS.name, userAddress);
  }

  userInfoLabel(userAddress: string): string {
    return concatStrings(PoolAbis.userInfo.name, userAddress);
  }

  mintedVAIsLabel(userAddress: string): string {
    return concatStrings(UnitrollerAbis.mintedVAIs.name, userAddress);
  }

  venusAccruedLabel(userAddress: string): string {
    return concatStrings(UnitrollerAbis.venusAccrued.name, userAddress);
  }

  balanceOfLabel(userAddress: string): string {
    return concatStrings(TokenAbis.balanceOf.name, userAddress);
  }
}

export default VenusProtocol;
