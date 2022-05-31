import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ClaimableDto,
  FeatureResultDto,
  IAssetResponseDto,
  IntegrationClaimableTokenDto,
  IntegrationFeaturesDataDto,
  LendingErcToken,
  LendingPositionDto,
} from '@app/common';
import { BaseDataClaimable } from '@app/common/dto/base.data.claimable.dto';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { CallData } from '@app/common/dto/call-data';
import {
  FeatureEnum,
  ProjectEnum,
  ProtocolTypeEnum,
  TraderjoeProtocolEnum,
} from '@app/common/enum';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { concatStrings } from '@app/common/utils';
import { normalizeDecimals } from '@app/common/utils/number';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { MulticallService } from '../../../chains/multicall/multicall.service';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { JTokenAbis } from './contracts/jToken.abis';
import { JoetrollerAbis } from './contracts/joetroller.abis';
import { OracleAbis } from './contracts/price-oracle.abis';
import { RewardDistributorAbis } from './contracts/reward-distributor.abis';
import { TraderJoeAddresses } from './trader-joe.constants';
import { APY, BalanceInfo } from './trader-joe.interfaces';

@Injectable()
export class TraderJoeLending {
  private readonly multicallService: MulticallService;
  static avaxMantissa = 1e18;
  static blocksPerDay = 30 * 60 * 24;
  static daysPerYear = 365;
  static blockTime = 2;

  constructor(
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
    private readonly accountService: AccountService,
  ) {
    this.multicallService = multicallProvider.getForChain(ChainAbbrEnum.avax);
  }

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const userData = await Promise.allSettled(
      addresses.flatMap((address) => {
        return this.getAsBaseData(address, chain);
      }),
    );

    const [data] = handlePromiseAllSettled(userData);

    return data.flat();
  }

  async getAsBaseData(address: Address, chain: ChainDto): Promise<BaseData[]> {
    const featureData = await this.getAllFeaturesData(address, chain);

    const factory = this.createBaseObjectFactory(
      address,
      chain,
      featureData,
      ProjectEnum.traderjoe,
      TraderjoeProtocolEnum.traderjoe,
    );
    const lending = plainToClass(
      BaseDataLending,
      factory(ProtocolTypeEnum.lending, FeatureEnum.lending),
    );
    const borrowing = plainToClass(
      BaseDataLending,
      factory(ProtocolTypeEnum.borrowing, FeatureEnum.borrowing),
    );
    const claimable = plainToClass(
      BaseDataClaimable,
      factory(ProtocolTypeEnum.lending, FeatureEnum.claimable),
    );

    return [lending, borrowing, claimable];
  }

  createBaseObjectFactory(
    address: Address,
    chain: ChainDto,
    featureData: IntegrationFeaturesDataDto,
    projectName: ProjectEnum,
    protocolName: TraderjoeProtocolEnum,
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
    const claimable = await this.getClaimableData(address.toLowerCase(), chain);

    response[FeatureEnum.lending] = lending;
    response[FeatureEnum.borrowing] = borrowing;
    response[FeatureEnum.claimable] = claimable;

    return response;
  }

  async getClaimableData(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<IntegrationClaimableTokenDto>> {
    const claimableJOE = await this.getToken(TraderJoeAddresses.joeToken.toLowerCase(), chain);
    const claimableAVAX = await this.getToken(TraderJoeAddresses.avax.toLowerCase(), chain);
    const [claimableJOEBalance, claimableAVAXBalance] = await this.getAccruedBalance(address);

    const prices = await this.getAssetPrices([claimableJOE.address, claimableAVAX.address], chain);

    const claimable: FeatureResultDto<IntegrationClaimableTokenDto> = {
      totalValue: 0,
      items: [],
    };

    if (Number(claimableJOEBalance) > 0) {
      const claimableJOEPosition = this.formatClaimableToken(
        claimableJOE,
        prices,
        claimableJOEBalance.toString(),
      );

      claimable.items.push(claimableJOEPosition);
      claimable.totalValue += claimableJOEPosition.claimableData.value;
    }

    if (Number(claimableAVAXBalance) > 0) {
      const claimableAVAXPosition = this.formatClaimableToken(
        claimableAVAX,
        prices,
        claimableAVAXBalance.toString(),
      );

      claimable.items.push(claimableAVAXPosition);
      claimable.totalValue += claimableAVAXPosition.claimableData.value;
    }

    return claimable;
  }

  async getLendingAndBorrowingData(
    address: Address,
    chain: ChainDto,
  ): Promise<FeatureResultDto<LendingPositionDto>[]> {
    const jTokens = await this.getJTokenList(); // get the up-to-date list of jTokens
    const rewardToken = await this.getToken(TraderJoeAddresses.joeToken.toLowerCase(), chain);

    const batchCall: Map<string, CallData> = await this.callsForJToken(jTokens, address);

    const underlyingTokens = new Map<string, string>(); // stores jToken and its underlying token addresses
    const balances: BalanceInfo[] =
      jTokens.map((jTokenAddress) => {
        const underlyingTokenAddress = batchCall
          .get(this.getUnderlyingLabel(jTokenAddress, address))
          ?.output.data.toString()
          .toLowerCase();
        underlyingTokens.set(jTokenAddress, underlyingTokenAddress);

        const balanceOfToken = batchCall.get(
          this.getBalanceOfUnderlyingLabel(jTokenAddress, address),
        ).output.data; // the amount of tokens which the user has
        const borrowBalance = batchCall.get(this.getBorrowBalanceLabel(jTokenAddress, address))
          .output.data; // the amount of borrowed tokens
        const balanceOfJToken = batchCall.get(this.getBalanceOfLabel(jTokenAddress, address)).output
          .data; // the amount of jToken which the user has
        const jTokenExchangeRate = batchCall.get(this.getExchangeRateLabel(jTokenAddress)).output
          .data;
        const jTokenSupplyRate = batchCall.get(this.getSupplyRateLabel(jTokenAddress)).output.data;
        const jTokenBorrowRate = batchCall.get(this.getBorrowRateLabel(jTokenAddress)).output.data;

        const jTokenStats = {
          exchangeRate: jTokenExchangeRate,
          supplyRate: jTokenSupplyRate,
          borrowRate: jTokenBorrowRate,
        };

        return {
          userAddress: address,
          jToken: jTokenAddress,
          jTokenBalance: balanceOfJToken,
          token: underlyingTokens.get(jTokenAddress),
          tokenBalance: balanceOfToken,
          borrowBalance,
          jTokenStats,
        };
      }) || [];

    const jTokenPrices = await this.getPricesFromOracle(jTokens);

    const rewardAPY: Map<string, APY> = await this.calcRewardAPY(jTokens, jTokenPrices, chain);

    // Get prices for all used tokens
    const prices = await this.getAssetPrices(
      [...Array.from(underlyingTokens.values()), rewardToken.address],
      chain,
    );

    const [lending, borrowing] = await Promise.all([
      this.getLendingDataResponse(balances, prices, rewardAPY, jTokenPrices, chain),
      this.getBorrowingDataResponse(balances, prices, rewardAPY, chain),
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
    balances: BalanceInfo[],
    prices: Map<string, string>,
    rewardAPY: Map<string, APY>,
    jTokenPrices: Map<string, BigNumber>,
    chain: ChainDto,
  ): Promise<FeatureResultDto<LendingPositionDto>> {
    let totalValue = 0;
    const items = [];
    await Promise.all(
      balances.map(async (b) => {
        if (Number(b.tokenBalance) > 0) {
          const tokenData = await this.getToken(b.token, chain);
          const jTokenData = await this.getToken(b.jToken, chain);

          const token = plainToClass(LendingErcToken, {
            address: b.token.toLowerCase(),
            decimals: tokenData.decimals,
            name: tokenData.name,
            symbol: tokenData.symbol,
            price:
              prices.get(b.token.toLowerCase()) ??
              normalizeDecimals(
                jTokenPrices.get(TraderJoeAddresses.jXJOE.toLowerCase()).toString(),
                18,
              ),
          });

          const tokenBalance = this.calcTokenBalance(
            Number(b.jTokenBalance),
            b.jTokenStats.exchangeRate,
            jTokenData.decimals,
          ).toString();
          const positionAPY =
            this.calcAPY(Number(b.jTokenStats.supplyRate)) +
            rewardAPY.get(b.jToken.toLowerCase()).supply;

          const lendPosition = this.formatLendingToken(
            b.jToken.toLowerCase(),
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
    balances: BalanceInfo[],
    prices: Map<string, string>,
    rewardAPY: Map<string, APY>,
    chain: ChainDto,
  ): Promise<FeatureResultDto<LendingPositionDto>> {
    let totalValue = 0;
    const items = [];

    await Promise.all(
      balances.map(async (b) => {
        if (Number(b.borrowBalance) > 0) {
          const tokenData = await this.getToken(b.token, chain);

          const token = plainToClass(LendingErcToken, {
            address: b.token.toLowerCase(),
            decimals: tokenData.decimals,
            name: tokenData.name,
            symbol: tokenData.symbol,
            price: Number(prices.get(b.token.toLowerCase())),
          });

          const positionAPY =
            -1 * this.calcAPY(Number(b.jTokenStats.borrowRate)) +
            rewardAPY.get(b.jToken.toLowerCase()).borrow;

          const borrowPosition = this.formatLendingToken(
            b.jToken,
            positionAPY,
            b.borrowBalance.toString(),
            token,
          );

          totalValue += borrowPosition.value ?? 0;

          items.push(borrowPosition);
        }
      }),
    );

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

  async callsForJToken(jTokens: string[], address: string): Promise<Map<string, CallData>> {
    const calls: Map<string, CallData> = new Map<string, CallData>();

    jTokens.forEach((jTokenAddress) => {
      const jTokenContract = new JTokenAbis(jTokenAddress);
      calls.set(
        this.getBalanceOfUnderlyingLabel(jTokenAddress, address),
        jTokenContract.balanceOfUnderlying(address),
      );
      calls.set(this.getBalanceOfLabel(jTokenAddress, address), jTokenContract.balanceOf(address));
      calls.set(
        this.getBorrowBalanceLabel(jTokenAddress, address),
        jTokenContract.borrowBalanceCurrent(address),
      );
      calls.set(this.getExchangeRateLabel(jTokenAddress), jTokenContract.exchangeRateCurrent());
      calls.set(this.getBorrowRateLabel(jTokenAddress), jTokenContract.borrowRatePerSec());
      calls.set(this.getSupplyRateLabel(jTokenAddress), jTokenContract.supplyRatePerSec());

      calls.set(this.getUnderlyingLabel(jTokenAddress, address), jTokenContract.underlying());
    });

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(calls);

    return batchCall;
  }

  async getToken(address: string, chain: ChainDto) {
    return this.accountService.getTrackedAssets(address, chain.id);
  }

  async getJTokenList(): Promise<string[]> {
    const joetrollerContract = new JoetrollerAbis(TraderJoeAddresses.joetroller);

    const call: Map<string, CallData> = new Map<string, CallData>([
      [this.getJTokenListLabel(TraderJoeAddresses.joetroller), joetrollerContract.getAllMarkets()],
    ]);

    const getJTokensCall: Map<string, CallData> = await this.multicallService.handleInBatches(call);

    const jTokenList = getJTokensCall.get(this.getJTokenListLabel(TraderJoeAddresses.joetroller))
      .output.data;
    return jTokenList;
  }

  calcTokenBalance(
    jTokenBalance: number,
    exchangeRateCurrent: BigNumber,
    underlyingDecimals: number,
  ) {
    const mantissa = 18 + underlyingDecimals - 8;
    const onejTokenInUnderlying = exchangeRateCurrent.div(Math.pow(10, mantissa));
    return new BigNumber(jTokenBalance)
      .multipliedBy(onejTokenInUnderlying) //
      .toNumber();
  }

  calcAPY(ratePerSec: number): number {
    const apy =
      (Math.pow(
        ((ratePerSec * TraderJoeLending.blockTime) / TraderJoeLending.avaxMantissa) *
          TraderJoeLending.blocksPerDay +
          1,
        TraderJoeLending.daysPerYear,
      ) -
        1) *
      100;
    return apy;
  }

  async calcRewardAPY(
    tokens: string[],
    jTokenPrices: Map<string, BigNumber>,
    chain: ChainDto,
  ): Promise<Map<string, APY>> {
    const totalSupplyAndBorrows = await this.getTotalSupplyAndBorrows(tokens);
    const rewardSpeeds = await this.getSpeeds(tokens);

    const rewardAPY = new Map<string, APY>();

    const { prices } = await this.priceService.getTokenPricesFetch(
      [TraderJoeAddresses.joeToken, TraderJoeAddresses.avax],
      chain.id,
    );
    const joePrice = prices[TraderJoeAddresses.joeToken.toLowerCase()];
    const avaxPrice = prices[TraderJoeAddresses.avax.toLowerCase()];

    await Promise.all(
      tokens.map(async (jTokenAddress) => {
        const underlyingTokenPrice = normalizeDecimals(
          jTokenPrices.get(jTokenAddress.toLowerCase()).toString(),
          18,
        );

        // Total supply needs to be converted from jTokens
        const mantissa = 18 + 18 - 8;

        const exchangeRate = normalizeDecimals(
          totalSupplyAndBorrows
            .get(this.getExchangeRateLabel(jTokenAddress))
            .output.data.toNumber(),
          mantissa,
        );

        const totalBorrows = normalizeDecimals(
          totalSupplyAndBorrows
            .get(this.getTotalBorrowsLabel(jTokenAddress))
            .output.data.toString(),
          18,
        );
        const totalSupply = normalizeDecimals(
          (
            totalSupplyAndBorrows
              .get(this.getTotalSupplyLabel(jTokenAddress))
              .output.data.toNumber() * exchangeRate
          ).toString(),
          8,
        );

        const joeSpeedSupply =
          rewardSpeeds.get(this.getSupplySpeedLabel(jTokenAddress, 0)).output.data / 1e18;
        const joeSpeedBorrow =
          rewardSpeeds.get(this.getBorrowSpeedLabel(jTokenAddress, 0)).output.data / 1e18;
        const joePerDaySupply =
          TraderJoeLending.blockTime * joeSpeedSupply * TraderJoeLending.blocksPerDay;
        const joePerDayBorrow =
          TraderJoeLending.blockTime * joeSpeedBorrow * TraderJoeLending.blocksPerDay;

        const joeBorrowApy = this.apyFormula(
          joePrice,
          joePerDayBorrow,
          totalBorrows,
          underlyingTokenPrice,
        );
        const joeSupplyApy = this.apyFormula(
          joePrice,
          joePerDaySupply,
          totalSupply,
          underlyingTokenPrice,
        );

        const avaxSpeedSupply =
          rewardSpeeds.get(this.getSupplySpeedLabel(jTokenAddress, 1)).output.data / 1e18;
        const avaxSpeedBorrow =
          rewardSpeeds.get(this.getBorrowSpeedLabel(jTokenAddress, 1)).output.data / 1e18;
        const avaxPerDaySupply =
          TraderJoeLending.blockTime * avaxSpeedSupply * TraderJoeLending.blocksPerDay;
        const avaxPerDayBorrow =
          TraderJoeLending.blockTime * avaxSpeedBorrow * TraderJoeLending.blocksPerDay;

        const avaxBorrowApy = this.apyFormula(
          avaxPrice,
          avaxPerDayBorrow,
          totalBorrows,
          underlyingTokenPrice,
        );
        const avaxSupplyApy = this.apyFormula(
          avaxPrice,
          avaxPerDaySupply,
          totalSupply,
          underlyingTokenPrice,
        );

        rewardAPY.set(jTokenAddress.toLowerCase(), {
          borrow: joeBorrowApy.toNumber() + avaxBorrowApy.toNumber(),
          supply: joeSupplyApy.toNumber() + avaxSupplyApy.toNumber(),
        });
      }),
    );

    return rewardAPY;
  }

  private apyFormula(
    tokenPrice: number,
    tokenPerDay: number,
    total: number,
    underlyingTokenPrice: number,
  ) {
    return new BigNumber(tokenPrice)
      .multipliedBy(tokenPerDay) //
      .div(total)
      .div(underlyingTokenPrice)
      .plus(1)
      .pow(365)
      .minus(1)
      .multipliedBy(100);
  }

  async getTotalSupplyAndBorrows(jTokens: string[]) {
    const calls = new Map<string, CallData>();
    jTokens.forEach((jTokenAddress) => {
      const jTokenContract = new JTokenAbis(jTokenAddress);

      calls.set(this.getTotalBorrowsLabel(jTokenAddress), jTokenContract.totalBorrowsCurrent());
      calls.set(this.getTotalSupplyLabel(jTokenAddress), jTokenContract.totalSupply());
      calls.set(this.getExchangeRateLabel(jTokenAddress), jTokenContract.exchangeRateCurrent());
    });

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(calls);

    return batchCall;
  }

  async getPricesFromOracle(tokens: string[]): Promise<Map<string, BigNumber>> {
    const oracleContract = new OracleAbis(TraderJoeAddresses.priceOracle);
    const prices = new Map<string, BigNumber>();

    const calls: Map<string, CallData> = new Map<string, CallData>(
      tokens.map((t) => [t.toLowerCase(), oracleContract.getUnderlyingPrice(t)]),
    );

    const pricesCall: Map<string, CallData> = await this.multicallService.handleInBatches(calls);

    pricesCall.forEach((callData, address) => {
      prices.set(address, new BigNumber(callData.output.data));
    });

    return prices;
  }

  async getSpeeds(tokens: string[]): Promise<Map<string, CallData>> {
    const unitrollerContract = new RewardDistributorAbis(TraderJoeAddresses.rewardDistributor);

    const calls: Map<string, CallData> = new Map<string, CallData>(
      tokens.flatMap((t) => {
        const obj = [
          [this.getSupplySpeedLabel(t, 0), unitrollerContract.rewardSupplySpeeds(0, t)], // supply speed for JOE token
          [this.getSupplySpeedLabel(t, 1), unitrollerContract.rewardSupplySpeeds(1, t)], // supply speed for AVAX token
          [this.getBorrowSpeedLabel(t, 0), unitrollerContract.rewardBorrowSpeeds(0, t)],
          [this.getBorrowSpeedLabel(t, 1), unitrollerContract.rewardBorrowSpeeds(1, t)],
        ];
        return obj as [];
      }),
    );

    const speedsCall: Map<string, CallData> = await this.multicallService.handleInBatches(calls);

    return speedsCall;
  }

  async getAccruedBalance(userAddress: string): Promise<BigNumber[]> {
    const rewardDistributorContract = new RewardDistributorAbis(
      TraderJoeAddresses.rewardDistributor,
    );

    const call: Map<string, CallData> = new Map<string, CallData>([
      [
        this.accruedBalanceLabel(userAddress, 0),
        rewardDistributorContract.rewardAccrued(0, userAddress),
      ],
      [
        this.accruedBalanceLabel(userAddress, 1),
        rewardDistributorContract.rewardAccrued(1, userAddress),
      ],
    ]);

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(call);

    return [
      batchCall.get(this.accruedBalanceLabel(userAddress, 0)).output.data,
      batchCall.get(this.accruedBalanceLabel(userAddress, 1)).output.data,
    ];
  }

  getJTokenListLabel(contract: string): string {
    return concatStrings(JoetrollerAbis.getAllMarkets.name, contract);
  }

  getBalanceOfUnderlyingLabel(contract: string, address: string): string {
    return concatStrings(JTokenAbis.balanceOfUnderlying.name, contract, address);
  }

  getBalanceOfLabel(contract: string, address: string): string {
    return concatStrings(JTokenAbis.balanceOf.name, contract, address);
  }

  getUnderlyingLabel(contract: string, address: string): string {
    return concatStrings(JTokenAbis.underlying.name, contract, address);
  }

  getBorrowBalanceLabel(contract: string, address: string): string {
    return concatStrings(JTokenAbis.borrowBalanceCurrent.name, contract, address);
  }

  getExchangeRateLabel(jTokenAddress: string): string {
    return concatStrings(JTokenAbis.exchangeRateCurrent.name, jTokenAddress);
  }

  getBorrowRateLabel(jTokenAddress: string): string {
    return concatStrings(JTokenAbis.borrowRatePerSec.name, jTokenAddress);
  }

  getSupplyRateLabel(jTokenAddress: string): string {
    return concatStrings(JTokenAbis.supplyRatePerSec.name, jTokenAddress);
  }

  getTotalBorrowsLabel(jTokenAddress: string): string {
    return concatStrings(JTokenAbis.totalBorrowsCurrent.name, jTokenAddress);
  }

  getTotalSupplyLabel(jTokenAddress: string): string {
    return concatStrings(JTokenAbis.totalSupply.name, jTokenAddress);
  }

  getSupplySpeedLabel(jTokenAddress: string, rewardType: number) {
    return concatStrings(RewardDistributorAbis.rewardSupplySpeeds.name, jTokenAddress, rewardType);
  }

  getBorrowSpeedLabel(jTokenAddress: string, rewardType: number) {
    return concatStrings(RewardDistributorAbis.rewardBorrowSpeeds.name, jTokenAddress, rewardType);
  }

  accruedBalanceLabel(user: string, rewardType: number) {
    return concatStrings(RewardDistributorAbis.rewardAccrued.name, user, rewardType);
  }
}
