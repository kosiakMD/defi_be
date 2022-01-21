import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Logger,
  IntegrationFeaturesDataDto,
  FeatureResultDto,
  LendingPositionDto,
  ChainAbbrEnum,
  ProjectEnum,
  Address,
  ChainDto,
  LendingErcToken,
  ProtocolTypeEnum,
  WePiggyProtocolEnum,
  FeatureEnum,
  ClaimableDto, 
  IntegrationClaimableTokenDto,
  IAssetResponseDto,
} from '@app/common';

import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { normalizeDecimals } from '@app/common/utils/number';
import { Web3ProviderService } from '@app/common/web3provider';
import { concatStrings } from '@app/common/utils';
import { BaseDataClaimable } from '@app/common/dto/base.data.claimable.dto';

import { BaseData } from '../../../common/interfaces/transactions.interfaces';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { Mapper } from '../helpers/mappers/mapper';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';

import DataProviderProtocol from './dataProviderProtocol';

import { PTokenAbis } from './wepiggy/contracts/pToken';
import { ComptrollerAbis } from './wepiggy/contracts/comptroller';
import { OracleAbis } from './wepiggy/contracts/oracle';
import { DistributionAbis } from './wepiggy/contracts/distribution';
import { CallData } from '@app/common/dto/CallData';

import { BalanceInfo, APY } from './wepiggy/wepiggy.interfaces';
import { wpcAddress, nativePTokens, blockTimes, contracts, zeroAddress } from './wepiggy/wepiggy.constants';

@Injectable()
export class WePiggyProtocol extends DataProviderProtocol {
  readonly chains = [ 
    ChainAbbrEnum.eth,
    ChainAbbrEnum.bsc,
    ChainAbbrEnum.okex,
    ChainAbbrEnum.plg,
    //ChainAbbrEnum.heco,
    ChainAbbrEnum.arbi,
    ChainAbbrEnum.opt,
    ChainAbbrEnum.mriver,
    ChainAbbrEnum.harm,
  ];
  readonly project = ProjectEnum.wepiggy;
  readonly displayName = 'WePiggy';
  readonly name = WePiggyProtocolEnum.wepiggy;
  readonly features = {
    [ChainAbbrEnum.eth]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
    ],
    [ChainAbbrEnum.bsc]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
    ],
    [ChainAbbrEnum.okex]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
    ],
    [ChainAbbrEnum.plg]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
    ],
    //[ChainAbbrEnum.heco]: [
    //  FeatureEnum.lending,
    //  FeatureEnum.borrowing,
    //  FeatureEnum.claimable,
    //],
    [ChainAbbrEnum.arbi]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
    ],
    [ChainAbbrEnum.opt]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
    ],
    [ChainAbbrEnum.mriver]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
      FeatureEnum.claimable,
    ],
    [ChainAbbrEnum.harm]: [
      FeatureEnum.lending,
      FeatureEnum.borrowing,
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
      ProjectEnum.wepiggy,
      WePiggyProtocolEnum.wepiggy,
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
    protocolName: WePiggyProtocolEnum,
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

    const [lending, borrowing] = await this.getLendingAndBorrowingData(address.toLowerCase(), chain);
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
    const claimableTokenBalance = await this.getAccruedWPCBalance(address, chain);

    if (Number(claimableTokenBalance) === 0) return ({
      totalValue: 0,
      items: [],
    });

    const claimableToken = await this.getToken(wpcAddress, chain); // WPC price returns only on bsc chain

    const prices = await this.getAssetPrices(
      [claimableToken.address],
      plainToClass(ChainDto, {id: 2}),
    );

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
    const pTokens = await this.getPTokenList(chain); // get the up-to-date list of pTokens
    
    const pTokensData: Map<string, CallData> = await this.callsForPToken(pTokens, address, chain);

    const underlyingTokens = new Map<string, string>(); // stores pToken and its underlying token addresses
    const balances: BalanceInfo[] = pTokens.map((pTokenAddress) => {
      const underlyingTokenAddress = pTokensData.get(this.getUnderlyingLabel(pTokenAddress, address))?.output.data.toString().toLowerCase() ?? zeroAddress;
      underlyingTokens.set(pTokenAddress, underlyingTokenAddress);

      const balanceOfToken = pTokensData.get(this.getBalanceOfUnderlyingLabel(pTokenAddress, address)).output.data; // the amount of tokens which the user has
      const borrowBalance = pTokensData.get(this.getBorrowBalanceLabel(pTokenAddress, address)).output.data; // the amount of borrowed tokens
      const balanceOfPToken = pTokensData.get(this.getBalanceOfLabel(pTokenAddress, address)).output.data; // the amount of pToken which the user has
      const pTokenExchangeRate = pTokensData.get(this.getExchangeRateLabel(pTokenAddress)).output.data;
      const pTokenSupplyRate = pTokensData.get(this.getSupplyRateLabel(pTokenAddress)).output.data;
      const pTokenBorrowRate = pTokensData.get(this.getBorrowRateLabel(pTokenAddress)).output.data;

      const pTokenStats = {
        exchangeRate: pTokenExchangeRate,
        supplyRate: pTokenSupplyRate,
        borrowRate: pTokenBorrowRate,
      };

      return {
        userAddress: address,
        pToken: pTokenAddress,
        pTokenBalance: balanceOfPToken,
        token: underlyingTokens.get(pTokenAddress),
        tokenBalance: balanceOfToken,
        borrowBalance,
        pTokenStats,
      };
    }) || [];

    // get prices for all used tokens (except WPC token)
    const prices = await this.getAssetPrices(
      [...Array.from(underlyingTokens.values())],
      chain,
    );

    // get WPC token price on bsc
    const wpcPrice = await this.getAssetPrices(
      [wpcAddress],
      plainToClass(ChainDto, {id: 2}),
    );

    prices.set(wpcAddress.toLowerCase(), wpcPrice.get(wpcAddress.toLowerCase()));

    const wpcAPY: Map<string, APY> = await this.calcWPCAPY(pTokens, underlyingTokens, prices, pTokensData, chain); // calculate mining APY for all pTokens

    const [lending, borrowing] = await Promise.all([
      this.getLendingDataResponse(balances, prices, wpcAPY, chain),
      this.getBorrowingDataResponse(balances, prices, wpcAPY, chain),
    ]);

    return [lending, borrowing];
  }

  async getAssetPrices(
    tokens: string[],
    chain: ChainDto,
  ): Promise<Map<string, string>> {
    const assets = new Set<string>(tokens.map(token => token.toLowerCase()));

    const { prices } = await this.priceService.getTokenPricesFetch(
      [...assets],
      chain.id,
    );

    return new Map(
      Object.entries(prices)
        .filter(([, price]) => price)
        .map(([asset, price]) => [asset.toLowerCase(), price.toString()]),
    );
  }

  async getLendingDataResponse(
    balances: BalanceInfo[],
    prices: Map<string, string>,
    wpcAPY: Map<string, APY>,
    chain: ChainDto,
  ): Promise<FeatureResultDto<LendingPositionDto>> {
    let totalValue = 0;
    const items = [];
    await Promise.all(balances.map(async (b) => {
      if (Number(b.tokenBalance) > 0) {
        const tokenData = await this.getToken(b.token, chain);
        const pTokenData = await this.getToken(b.pToken, chain);

        const token = plainToClass(LendingErcToken, {
          address: b.token.toLowerCase(),
          decimals: tokenData.decimals,
          name: tokenData.name,
          symbol: tokenData.symbol,
          price: prices.get(b.token.toLowerCase()),
        });
        
        const tokenBalance = this.calcTokenBalance(Number(b.pTokenBalance), b.pTokenStats.exchangeRate, pTokenData.decimals).toString();
        const positionAPY = this.calcAPY(Number(b.pTokenStats.supplyRate), chain) + wpcAPY.get(b.pToken.toLowerCase()).supply;

        const lendPosition = this.formatLendingToken(
          b.pToken.toLowerCase(),
          positionAPY,
          tokenBalance,
          token,
        );
  
        totalValue += lendPosition.value ?? 0;
  
        items.push(lendPosition);
      }
    }));

    const lending: FeatureResultDto<LendingPositionDto> = {
      totalValue,
      items,
    };

    return lending;
  }

  async getBorrowingDataResponse(
    balances: BalanceInfo[],
    prices: Map<string, string>,
    wpcAPY: Map<string, APY>,
    chain: ChainDto,
  ): Promise<FeatureResultDto<LendingPositionDto>> {
    let totalValue = 0;
    const items = [];

    await Promise.all(balances.map(async (b) => {
      if (Number(b.borrowBalance) > 0) {
        const tokenData = await this.getToken(b.token, chain);
        
        const token = plainToClass(LendingErcToken, {
          address: b.token.toLowerCase(),
          decimals: tokenData.decimals,
          name: tokenData.name,
          symbol: tokenData.symbol,
          price: Number(prices.get(b.token.toLowerCase())),
        });

        const positionAPY = this.calcAPY(Number(b.pTokenStats.borrowRate), chain) - wpcAPY.get(b.pToken.toLowerCase()).borrow;

        const borrowPosition = this.formatLendingToken(
          b.pToken,
          positionAPY,
          b.borrowBalance.toString(),
          token,
        );
  
        totalValue += borrowPosition.value ?? 0;

        items.push(borrowPosition);
      }
    }));

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

  formatClaimableToken(token: IAssetResponseDto, prices: Map<string, string>, balance: string,) {
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

  async getPTokenList(chain: ChainDto): Promise<string[]> {
    const comptrollerAddress = this.getComptroller(chain);
    const comptrollerContract = new ComptrollerAbis(comptrollerAddress);
    
    const call: Map<string, CallData> = new Map<string, CallData>([
      [this.getPTokenListLabel(comptrollerAddress), comptrollerContract.getAllMarkets()],
    ]);
    
    const getPTokensCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      chain.id,
    );
    
    const pTokenList = getPTokensCall.get(this.getPTokenListLabel(comptrollerAddress)).output.data;
    return pTokenList;
  }

  getComptroller(chain: ChainDto) {
    return contracts[chain.name].comptroller;
  }

  calcTokenBalance(pTokenBalance: number, exchangeRateCurrent: BigNumber, underlyingDecimals: number) {
    const mantissa = 18 + underlyingDecimals - 8;
    const onepTokenInUnderlying = exchangeRateCurrent.div(Math.pow(10, mantissa));
    return new BigNumber(pTokenBalance).multipliedBy(onepTokenInUnderlying) //
      .toNumber();
  }

  calcAPY(ratePerBlock: number, chain: ChainDto): number {
    const blockTime = blockTimes[chain.name];
    const mantissa = 1e18;
    const blocksPerDay = 60 * 60 * 24 / blockTime;
    const daysPerYear = 365;

    const apy = (Math.pow((ratePerBlock / mantissa * blocksPerDay + 1), daysPerYear) - 1) * 100;
    return apy;
  }

  async calcWPCAPY(
    tokens: string[], 
    underlyingTokens: Map<string, string>, 
    prices: Map<string, string>, 
    pTokensData: Map<string, CallData>, 
    chain: ChainDto
  ): Promise<Map<string, APY>> {
    const wpcSpeeds = await this.getWPCSpeeds(tokens, chain);
    const wpcAPY = new Map<string, APY>();

    const oraclePrices = await this.getPricesFromOracle(tokens, chain);

    const wpcPrice = Number(prices.get(wpcAddress.toLowerCase()));

    await Promise.all(tokens.map(async (pTokenAddress) => {
      const underlyingToken = await this.getToken(underlyingTokens.get(pTokenAddress), chain);
      const underlyingTokenPrice = normalizeDecimals(oraclePrices.get(pTokenAddress.toLowerCase()).toString(), underlyingToken.decimals);
      
      // Total supply needs to be converted from pTokens
      const mantissa = 18 + underlyingToken.decimals - 8;
      
      const exchangeRate = normalizeDecimals((pTokensData.get(this.getExchangeRateLabel(pTokenAddress)).output.data).toNumber(), mantissa);

      const totalBorrows = normalizeDecimals(
        pTokensData.get(this.getTotalBorrowsLabel(pTokenAddress)).output.data.toString(), 
        underlyingToken.decimals,
      );

      const totalSupply = normalizeDecimals(
        ((pTokensData.get(this.getTotalSupplyLabel(pTokenAddress)).output.data).toNumber() * exchangeRate).toString(), 
        8,
      );
      
      const apxBlockSpeedInSeconds = blockTimes[chain.name];
      const blocksPerDay = (60 * 60 * 24) / apxBlockSpeedInSeconds;
      const wpcSpeed = wpcSpeeds.get(pTokenAddress).output.data / 1e18;
      const wpcPerDay = wpcSpeed * blocksPerDay;

      const wpcBorrowApy = this.apyFormula(wpcPrice, wpcPerDay, totalBorrows, underlyingTokenPrice);
      const wpcSupplyApy = this.apyFormula(wpcPrice, wpcPerDay, totalSupply, underlyingTokenPrice);

      wpcAPY.set(pTokenAddress.toLowerCase(), {
        borrow: wpcBorrowApy.toNumber(),
        supply: wpcSupplyApy.toNumber(),
      })
    }));

    return wpcAPY;
  }

  private apyFormula(wpcPrice: number, wpcPerDay: number, total: number, underlyingTokenPrice: number) {
    return ((new BigNumber(wpcPrice).multipliedBy(wpcPerDay) //
      .div(total)
      .div(underlyingTokenPrice)
      .plus(1))
      .pow(365)
      .minus(1))
      .multipliedBy(100)
      .multipliedBy(1000);
  }

  async getPricesFromOracle(tokens: string[], chain: ChainDto): Promise<Map<string, BigNumber>> {
    const oracleContract = new OracleAbis(contracts[chain.name].oracle);
    const prices = new Map<string, BigNumber>();

    const calls: Map<string, CallData> = new Map<string, CallData>(tokens.map(t => 
      [t.toLowerCase(), oracleContract.getUnderlyingPrice(t)]
    ));
    
    const pricesCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      calls,
      chain.id,
    );

    pricesCall.forEach((callData, address) => {
      prices.set(address, new BigNumber(callData.output.data));
    });

    return prices;
  }

  async getWPCSpeeds(tokens: string[], chain: ChainDto): Promise<Map<string, CallData>> {
    const distributionContract = new DistributionAbis(this.getDistributionContract(chain));

    const call: Map<string, CallData> = new Map<string, CallData>(tokens.map(t => 
      [t, distributionContract.wpcSpeeds(t)]
    ));
    
    const wpcSpeedsCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      chain.id,
    );

    return wpcSpeedsCall;
  }

  async getAccruedWPCBalance(userAddress: string, chain: ChainDto): Promise<BigNumber> {
    const distributionContract = new DistributionAbis(this.getDistributionContract(chain));

    const call: Map<string, CallData> = new Map<string, CallData>([
      [this.wpcAccruedLabel(userAddress), distributionContract.pendingWPCAccrued(userAddress, true, true)],
    ]);

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      call,
      chain.id,
    );

    return batchCall.get(this.wpcAccruedLabel(userAddress)).output.data.multipliedBy(1000);;
  }

  async callsForPToken(pTokens: string[], address: string, chain: ChainDto): Promise<Map<string, CallData>> {
    const chainNativeToken = this.getNativePToken(chain);

    const calls: Map<string, CallData> = new Map<string, CallData>();

    pTokens.forEach((pTokenAddress) => {
      const pTokenContract = new PTokenAbis(pTokenAddress);
      calls.set(this.getBalanceOfUnderlyingLabel(pTokenAddress, address), pTokenContract.balanceOfUnderlying(address));
      calls.set(this.getBalanceOfLabel(pTokenAddress, address), pTokenContract.balanceOf(address));
      calls.set(this.getBorrowBalanceLabel(pTokenAddress, address), pTokenContract.borrowBalanceCurrent(address));
      calls.set(this.getExchangeRateLabel(pTokenAddress), pTokenContract.exchangeRateCurrent());
      calls.set(this.getBorrowRateLabel(pTokenAddress), pTokenContract.borrowRatePerBlock());
      calls.set(this.getSupplyRateLabel(pTokenAddress), pTokenContract.supplyRatePerBlock());
      calls.set(this.getTotalSupplyLabel(pTokenAddress), pTokenContract.totalSupply());
      calls.set(this.getTotalBorrowsLabel(pTokenAddress), pTokenContract.totalBorrowsCurrent());

      if (pTokenAddress.toLowerCase() !== chainNativeToken) { // pTokens of native tokens of the chain does not have underlying() method
        calls.set(this.getUnderlyingLabel(pTokenAddress, address), pTokenContract.underlying());
      }
    });

    const batchCall: Map<string, CallData> = await this.multicallService.handleInBatches(
      calls,
      chain.id,
    );

    return batchCall;
  }

  getDistributionContract(chain: ChainDto) {
    return contracts[chain.name].distribution;
  }

  getNativePToken(chain: ChainDto) {
    return nativePTokens[chain.name];
  }

  wpcAccruedLabel(address: string) {
    return concatStrings(DistributionAbis.pendingWPCAccrued.name, address);
  }

  getBalanceOfUnderlyingLabel(contract: string, address: string): string {
    return concatStrings(PTokenAbis.balanceOfUnderlying.name, contract, address);
  }

  getBalanceOfLabel(contract: string, address: string): string {
    return concatStrings(PTokenAbis.balanceOf.name, contract, address);
  }

  getUnderlyingLabel(contract: string, address: string): string {
    return concatStrings(PTokenAbis.underlying.name, contract, address);
  }
  
  getBorrowBalanceLabel(contract: string, address: string): string {
    return concatStrings(PTokenAbis.borrowBalanceCurrent.name, contract, address);
  }

  getPTokenListLabel(contract: string): string {
    return concatStrings(ComptrollerAbis.getAllMarkets.name, contract);
  }

  getExchangeRateLabel(pTokenAddress: string): string {
    return concatStrings(PTokenAbis.exchangeRateCurrent.name, pTokenAddress);
  }

  getBorrowRateLabel(pTokenAddress: string): string {
    return concatStrings(PTokenAbis.borrowRatePerBlock.name, pTokenAddress);
  }

  getSupplyRateLabel(pTokenAddress: string): string {
    return concatStrings(PTokenAbis.supplyRatePerBlock.name, pTokenAddress);
  }

  getTotalBorrowsLabel(pTokenAddress: string): string {
    return concatStrings(PTokenAbis.totalBorrowsCurrent.name, pTokenAddress);
  }

  getTotalSupplyLabel(pTokenAddress: string): string {
    return concatStrings(PTokenAbis.totalSupply.name, pTokenAddress);
  }
}

export default WePiggyProtocol;
