import {
  AddressProviderFromJson,
  Anchor,
  columbus5,
  MARKET_DENOMS,
} from '@anchor-protocol/anchor.js';
import { LCDClient } from '@terra-money/terra.js';
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  AnchorProtocolEnum,
  ChainDto,
  ClaimableDto,
  CurrentPricesPayload,
  FeatureEnum,
  FeatureResult,
  IAssetResponseDto,
  IntegrationClaimableTokenDto,
  IntegrationFeaturesDataDto,
  LendingPositionDto,
  Logger,
  ProjectEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataClaimable } from '@app/common/dto/base.data.claimable.dto';
import { BaseDataLending } from '@app/common/dto/base.data.lending.dto';
import { LendingTokenDto } from '@app/common/dto/lending.token.dto';
import { handlePromiseAllSettled } from '@app/common/helpers/promises';
import { Web3ProviderService } from '@app/common/web3provider';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';
import { toDecimals } from '../../../../common/utils/util';

import { MulticallProvider } from '../../../chain/multicall/multicall.provider';
import { AccountService } from '../../../microservice/account.service';
import { PriceService } from '../../../microservice/price.service';

@Injectable()
export class AnchorLending {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly priceService: PriceService,
    private readonly multicallProvider: MulticallProvider,
    private readonly accountService: AccountService,
    private readonly web3Provider: Web3ProviderService,
  ) {}

  public async getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]> {
    const userData = await Promise.allSettled(
      addresses.flatMap((address) => {
        return this.getAsBaseData(address.toLowerCase(), chain);
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
      ProjectEnum.anchor,
      AnchorProtocolEnum.anchor,
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
    protocolName: AnchorProtocolEnum,
  ) {
    return function (protocolType: ProtocolTypeEnum, feature: FeatureEnum) {
      return {
        chain,
        userAddress: address,
        protocolType,
        projectName,
        protocolName,
        total: featureData[feature]?.totalValue,
        feature,
        items: featureData[feature]
          ? featureData[feature].items?.length
            ? featureData[feature].items
            : [featureData[feature]]
          : [],
      };
    };
  }

  async getAllFeaturesData(address: Address, chain: ChainDto): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    const terra: LCDClient = this.web3Provider.getInstanceByChainId(chain.id);
    const addressProvider = new AddressProviderFromJson(columbus5);

    const dbTokens = await this.accountService.getAssets(
      [addressProvider.aTerra(), addressProvider.ANC(), addressProvider.bLunaToken(), 'uusd'],
      [chain.id],
    );

    const dbTokensMap = dbTokens.data?.reduce((resp, token) => {
      resp.set(token.address, token);
      return resp;
    }, new Map());

    const tokensPrices = await this.priceService.getTokenPricesFetch(
      Array.from(dbTokensMap.keys()),
      chain.id,
    );

    const [lending, [borrowing, claimable]] = await Promise.all([
      await this.getLendingData(
        address,
        chain,
        dbTokensMap,
        terra,
        tokensPrices.prices,
        addressProvider,
      ),
      this.getBorrowingData(address, terra, dbTokensMap, tokensPrices.prices, addressProvider),
    ]);

    response[FeatureEnum.lending] = lending;
    response[FeatureEnum.borrowing] = borrowing;
    response[FeatureEnum.claimable] = claimable;

    return response;
  }

  async getBorrowingData(
    address: Address,
    terra: LCDClient,
    dbTokensMap: Map<string, IAssetResponseDto>,
    tokensPrices: CurrentPricesPayload,
    addressProvider: AddressProviderFromJson,
  ) {
    const aTerraToken = dbTokensMap.get(addressProvider.aTerra());
    // eslint-disable-next-line camelcase
    const { loan_amount, pending_rewards } = await terra.wasm.contractQuery(
      addressProvider.market(),
      {
        // eslint-disable-next-line camelcase
        borrower_info: {
          borrower: address,
        },
      },
    );
    const borrowAmountDec = toDecimals(loan_amount, aTerraToken.decimals);
    let borrowing = null;
    // eslint-disable-next-line camelcase
    if (loan_amount > 0) {
      borrowing = this.getLendingObj(
        addressProvider,
        dbTokensMap.get('uusd'),
        borrowAmountDec,
        tokensPrices,
      );
    }

    const ancToken = dbTokensMap.get(addressProvider.ANC());
    const pendingRewardsDec = toDecimals(pending_rewards, ancToken.decimals);
    let claimable = null;
    // eslint-disable-next-line camelcase
    if (pending_rewards > 0) {
      claimable = plainToClass(IntegrationClaimableTokenDto, {
        address: ancToken.address.toLowerCase(),
        decimals: ancToken.decimals,
        name: ancToken.name,
        symbol: ancToken.symbol,
        price: tokensPrices[ancToken.address.toLowerCase()],
        claimableData: plainToClass(ClaimableDto, {
          balance: pendingRewardsDec,
          value: new BigNumber(pendingRewardsDec) //
            .multipliedBy(tokensPrices[ancToken.address.toLowerCase()])
            .toNumber(),
        }),
      });
    }

    return [borrowing, claimable];
  }

  async getLendingData(
    address: Address,
    chain: ChainDto,
    dbTokensMap: Map<string, IAssetResponseDto>,
    terra: LCDClient,
    tokensPrices: CurrentPricesPayload,
    addressProvider: AddressProviderFromJson,
  ): Promise<FeatureResult<LendingPositionDto>> {
    const anchor = new Anchor(terra, addressProvider);
    const [balanceObj, lendingApy] = await Promise.all([
      terra.wasm.contractQuery(addressProvider.aTerra(), {
        balance: { address: address },
      }),
      anchor.earn.getAPY({ market: MARKET_DENOMS.UUSD }),
    ]);
    const aTerraToken = dbTokensMap.get(addressProvider.aTerra());

    const lendingBalanceDec = toDecimals(balanceObj['balance'], aTerraToken.decimals);
    const lending = [];
    if (lendingBalanceDec > 0) {
      lending.push(
        this.getLendingObj(
          addressProvider,
          aTerraToken,
          lendingBalanceDec,
          tokensPrices,
          lendingApy,
        ),
      );
    }

    const { collaterals } = await terra.wasm.contractQuery(addressProvider.overseer(), {
      collaterals: { borrower: address },
    });

    if (collaterals.length) {
      const bLunaToken = dbTokensMap.get(addressProvider.bLunaToken());
      lending.push(
        ...collaterals.map((collateral) => {
          const collateralValueDec = toDecimals(collateral[1], bLunaToken.decimals);
          return this.getLendingObj(addressProvider, bLunaToken, collateralValueDec, tokensPrices);
        }),
      );
    }
    return { totalValue: 0, items: lending };
  }

  getLendingObj(
    addressProvider: AddressProviderFromJson,
    token: IAssetResponseDto,
    amount: number,
    prices: CurrentPricesPayload,
    apy?: number,
  ) {
    return plainToClass(LendingPositionDto, {
      address: addressProvider.overseer(),
      balance: amount,
      value: prices[token.address] * amount,
      apy: apy * 100 || null,
      token: plainToClass(LendingTokenDto, {
        address: token.address,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        price: prices[token.address],
      }),
    });
  }
}
