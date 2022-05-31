import { JsonRpcProvider } from '@ethersproject/providers';
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ChainIdEnum,
  CurrentPricesPayload,
  FeatureEnum,
  FeatureResultDto,
  IntegrationFeaturesDataDto,
  LendingErcToken,
  LendingPositionDto,
  Logger,
  ProjectEnum,
  YearnProtocolEnum,
} from '@app/common';
import { decimalsDivider } from '@app/common/utils';

import { Asset } from '../../../common/interfaces/transactions.interfaces';

import { Web3Provider } from '../../chains/web3.provider';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { YearnV2Subgraph } from '../../subgraph/subgraphs/yearn-v2.subgraph';
import RegistryAdapterIronBank from './yearn/contracts/registery-adapter-iron-bank';
import { YearnProtocolBase } from './yearn/yearn-protocol-base';
import { ironBankAddressByChain } from './yearn/yearn.constants';
import { PositionType } from './yearn/yearn.enums';
import { IIronBankMarketDynamic, IIronBankUserPosition } from './yearn/yearn.interfaces';

@Injectable()
export default class YearnProtocolV2 extends YearnProtocolBase {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.ftm];
  readonly displayName = 'YearnV2';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.staking],
    [ChainAbbrEnum.ftm]: [FeatureEnum.staking],
  };
  readonly project = ProjectEnum.yearn;
  readonly name = YearnProtocolEnum.YearnV2;

  readonly provider: JsonRpcProvider;
  readonly rpcs: Map<ChainIdEnum, string>;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly yearnSubgraph: YearnV2Subgraph,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly configService: ConfigService,
    protected readonly web3Provider: Web3Provider,
  ) {
    super();

    this.rpcs = new Map([
      [ChainIdEnum.eth, configService.get<string>('ETH_URL')],
      [ChainIdEnum.ftm, configService.get<string>('FTM_URL')],
    ]);
  }

  async getAllFeaturesData(address: Address, chain: ChainDto): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    await Promise.all([
      this.getStakingData(response, address, chain),
      this.getLendingAndBorrowingData(response, address, chain),
    ]);

    return response;
  }

  async getLendingAndBorrowingData(
    response: IntegrationFeaturesDataDto,
    address: Address,
    chain: ChainDto,
  ) {
    if (!this.rpcs.has(chain.id)) {
      return;
    }

    const web3Provider = this.web3Provider.getForChain(chain.abbr);
    const ironBankContract = new web3Provider.eth.Contract(
      RegistryAdapterIronBank,
      ironBankAddressByChain.get(chain.id),
    );

    const userPositions: IIronBankUserPosition[] = await ironBankContract.methods
      .assetsPositionsOf(address)
      .call();

    if (!userPositions.length) {
      response[FeatureEnum.lending] = null;
      response[FeatureEnum.borrowing] = null;
      return;
    }

    const assets = this.getUniqueFields<IIronBankUserPosition>(userPositions, (a) =>
      a.assetAddress.toLowerCase(),
    );

    const tokenAddresses = this.getUniqueFields<IIronBankUserPosition>(userPositions, (a) =>
      a.tokenAddress.toLowerCase(),
    );

    const [{ data: rawTokens }, { prices }, ironBankMarketDynamic, blocksPerYear] =
      await Promise.all([
        this.accountService.getAssets(tokenAddresses, [chain.id]),
        this.priceService.getTokenPricesFetch(tokenAddresses, chain.id),
        ironBankContract.methods.assetsDynamic(assets).call(),
        ironBankContract.methods.blocksPerYear().call(),
      ]);

    const ironBankMarket = this.formatIronBankMarkets(ironBankMarketDynamic, blocksPerYear);

    const tokens = new Map(rawTokens.map((token) => [token.address.toLowerCase(), token]));

    const { lending, borrowing } = this.formatLendingMarketPositions(
      userPositions,
      ironBankMarket,
      tokens,
      prices,
    );
    response[FeatureEnum.lending] = lending;
    response[FeatureEnum.borrowing] = borrowing;
  }

  getUniqueFields<T>(array: T[], callbackfn: (value: T, index: number, array: T[]) => string) {
    return Array.from(new Set<string>(array.map(callbackfn)));
  }

  formatIronBankMarkets(
    ironBankMarketDynamic: IIronBankMarketDynamic[],
    blocksPerYear: string,
  ): IIronBankMarketDynamic[] {
    const ironBankMarket: IIronBankMarketDynamic[] = [];
    for (const asset of ironBankMarketDynamic) {
      const newAsset: IIronBankMarketDynamic = {
        address: asset.address,
        typeId: asset.typeId,
        tokenId: asset.tokenId,
        underlyingTokenBalance: asset.underlyingTokenBalance,
        metadata: {
          totalSuppliedUsdc: asset.metadata.totalSuppliedUsdc,
          totalBorrowedUsdc: asset.metadata.totalBorrowedUsdc,
          lendAprBips: asset.metadata.lendAprBips,
          borrowAprBips: asset.metadata.borrowAprBips,
          lendApyBips: YearnProtocolV2.aprBipsToApyBips(asset.metadata.lendAprBips, blocksPerYear),
          borrowApyBips: YearnProtocolV2.aprBipsToApyBips(
            asset.metadata.borrowAprBips,
            blocksPerYear,
          ),
          liquidity: asset.metadata.liquidity,
          liquidityUsdc: asset.metadata.liquidityUsdc,
          collateralFactor: asset.metadata.collateralFactor,
          isActive: asset.metadata.isActive,
          reserveFactor: asset.metadata.reserveFactor,
          exchangeRate: asset.metadata.exchangeRate,
        },
      };
      ironBankMarket.push(newAsset);
    }
    return ironBankMarket;
  }

  formatLendingMarketPositions(
    userPositions: IIronBankUserPosition[],
    ironBankMarket: IIronBankMarketDynamic[],
    tokens: Map<string, Asset>,
    prices: CurrentPricesPayload,
  ) {
    const ironBankMarketMap = new Map(ironBankMarket.map((market) => [market.address, market]));

    let totalLendingValue = 0;
    const lendPositions = [];
    let totalBorrowingValue = 0;
    const borrowPositions = [];

    userPositions.forEach((position) => {
      let nextPosition;
      const args: [IIronBankUserPosition, IIronBankMarketDynamic, Asset, number] = [
        position,
        ironBankMarketMap.get(position.assetAddress),
        tokens.get(position.tokenAddress.toLowerCase()),
        Number(prices[position.tokenAddress.toLowerCase()]),
      ];

      switch (position.typeId) {
        case PositionType.Lend:
          nextPosition = this.formatLendPosition(...args);
          totalLendingValue += nextPosition.value;
          lendPositions.push(nextPosition);
          break;
        case PositionType.Borrow:
          nextPosition = this.formatBorrowPosition(...args);
          totalBorrowingValue += nextPosition.value;
          borrowPositions.push(nextPosition);
          break;
      }
    });

    const lending: FeatureResultDto<LendingPositionDto> = {
      totalValue: totalLendingValue,
      items: lendPositions,
    };

    const borrowing: FeatureResultDto<LendingPositionDto> = {
      totalValue: totalBorrowingValue,
      items: borrowPositions,
    };

    return { lending, borrowing };
  }

  formatLendPosition(
    position: IIronBankUserPosition,
    market: IIronBankMarketDynamic,
    token: Asset,
    price: number,
  ) {
    const balance = new BigNumber(position.underlyingTokenBalance.amount).dividedBy(
      decimalsDivider(token.decimals),
    );

    const value = balance.multipliedBy(price);

    return plainToClass(LendingPositionDto, {
      address: position.assetAddress,
      balance: balance.toNumber(),
      value: value.toNumber(),
      apy: Number(market.metadata.lendApyBips) / 100,
      token: plainToClass(LendingErcToken, {
        address: position.tokenAddress,
        decimals: token.decimals,
        name: token.name,
        symbol: token.symbol,
        price,
      }),
    });
  }

  formatBorrowPosition(
    position: IIronBankUserPosition,
    market: IIronBankMarketDynamic,
    token: Asset,
    price: number,
  ) {
    const balance = new BigNumber(position.underlyingTokenBalance.amount).dividedBy(
      decimalsDivider(token.decimals),
    );

    const value = balance.multipliedBy(price);
    return {
      address: position.assetAddress,
      balance: balance.toNumber(),
      value: value.toNumber(),
      apy: Number(market.metadata.borrowApyBips) / 100,
      token: {
        address: position.tokenAddress,
        decimals: token.decimals,
        name: token.name,
        symbol: token.symbol,
        price,
      },
    };
  }

  private static aprBipsToApyBips(aprBips: number, period: string): number {
    const bn = BigNumber.clone({ POW_PRECISION: 6 });
    const apy = new bn(aprBips)
      .div(new bn(10).pow(4))
      .div(period)
      .plus(1)
      .pow(period)
      .minus(1)
      .multipliedBy(new bn(10).pow(4))
      .toFixed(0);

    return Number(apy);
  }
}
