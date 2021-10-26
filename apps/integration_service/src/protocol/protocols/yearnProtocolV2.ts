import { JsonRpcProvider } from '@ethersproject/providers';
import { IronBankMarketDynamic, Position as IronBankUserPosition, Yearn } from '@yfi/sdk';
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  ChainAbbrEnum,
  ProjectEnum,
  Logger,
  IntegrationFeaturesDataDto,
  ChainIdEnum,
  FeatureEnum,
  YearnProtocolEnum,
  Address,
  CurrentPricesPayload,
  LendingPositionDto,
  LendingErcToken,
  FeatureResultDto,
} from '@app/common';
import { getAbsoluteChainId } from '@app/common/utils/chains';

import { AccountService } from '../../account/account.service';
import { Asset } from '../../interfaces/transactions.interfaces';
import { PriceService } from '../../price/price.service';
import { decimalsDivider } from '../../utils/util';
import { YearnV2Subgraph } from './yearn/services/yearn.v2.subgraph';
import { PositionType } from './yearn/yearn.enums';
import { SdkSupportedChains } from './yearn/yearn.types';
import { YearnProtocolBase } from './yearn/yearnProtocolBase';

@Injectable()
export default class YearnProtocolV2 extends YearnProtocolBase {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.ftm];
  readonly displayName = 'YearnV2';
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.staking, FeatureEnum.lending, FeatureEnum.borrowing],
    [ChainAbbrEnum.ftm]: [FeatureEnum.staking, FeatureEnum.lending, FeatureEnum.borrowing],
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
  ) {
    super();

    this.rpcs = new Map([
      [ChainIdEnum.eth, configService.get<string>('ETH_URL')],
      [ChainIdEnum.ftm, configService.get<string>('FTM_RPC_URL')],
    ]);
  }

  async getAllFeaturesData(
    address: string,
    chainId: ChainIdEnum,
  ): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    await Promise.all([
      this.getStakingData(response, address, chainId),
      this.getLendingAndBorrowingData(response, address, chainId),
    ]);

    return response;
  }

  async getLendingAndBorrowingData(
    response: IntegrationFeaturesDataDto,
    address: Address,
    chainId: ChainIdEnum,
  ) {
    if (!this.rpcs.has(chainId)) {
      return;
    }

    const provider = new JsonRpcProvider(this.rpcs.get(chainId));

    const yearn = new Yearn(getAbsoluteChainId(chainId) as SdkSupportedChains, {
      provider,
      cache: { useCache: false },
    });

    const userPositions = await yearn.ironBank.positionsOf(address);

    if (!userPositions.length) {
      response[FeatureEnum.lending] = null;
      response[FeatureEnum.borrowing] = null;
      return;
    }

    const assets = Array.from(new Set(userPositions.map((a) => a.assetAddress.toLowerCase())));
    const tokenAddresses = Array.from(
      new Set(userPositions.map((a) => a.tokenAddress.toLowerCase())),
    );

    const [{ data: rawTokens }, { prices }, ironBankMarket] = await Promise.all([
      this.accountService.getAssets(tokenAddresses, [chainId]),
      this.priceService.getTokenPricesFetch(tokenAddresses, chainId),
      yearn.ironBank.getDynamic(assets),
    ]);

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

  formatLendingMarketPositions(
    userPositions: IronBankUserPosition[],
    ironBankMarket: IronBankMarketDynamic[],
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
      const args: [IronBankUserPosition, IronBankMarketDynamic, Asset, number] = [
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
    position: IronBankUserPosition,
    market: IronBankMarketDynamic,
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
      APY: Number(market.metadata.lendApyBips) / 100,
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
    position: IronBankUserPosition,
    market: IronBankMarketDynamic,
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
}
