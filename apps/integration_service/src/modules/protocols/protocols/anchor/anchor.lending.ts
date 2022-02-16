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

import { MulticallProvider } from '../../../chains/multicall/multicall.provider';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';

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
        total: featureData[feature].totalValue,
        feature,
        items: [featureData[feature]],
      };
    };
  }

  async getAllFeaturesData(address: Address, chain: ChainDto): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    const [lending, borrowing, claimable] = await this.getLendingAndBorrowingData(
      address.toLowerCase(),
      chain,
    );

    response[FeatureEnum.lending] = lending;
    response[FeatureEnum.borrowing] = borrowing;
    response[FeatureEnum.claimable] = claimable;

    return response;
  }

  async getLendingAndBorrowingData(address: Address, chain: ChainDto) {
    try {
      const terra: LCDClient = this.web3Provider.getInstanceByChainId(chain.id);
      const addressProvider = new AddressProviderFromJson(columbus5);
      const anchor = new Anchor(terra, addressProvider);
      const tokenPrices = await this.priceService.getTokenPricesFetch(
        [addressProvider.aTerra(), addressProvider.ANC()],
        chain.id,
      );
      const [aTerraToken, ancToken] = await Promise.all([
        this.accountService.getTrackedAssets(addressProvider.aTerra(), chain.id),
        this.accountService.getTrackedAssets(addressProvider.ANC(), chain.id),
      ]);

      const { balance } = await terra.wasm.contractQuery(addressProvider.aTerra(), {
        balance: { address: address },
      });
      // eslint-disable-next-line camelcase
      const { exchange_rate } = await terra.wasm.contractQuery(addressProvider.market(), {
        // eslint-disable-next-line camelcase
        epoch_state: {},
      });
      const lendingApy = await anchor.earn.getAPY({ market: MARKET_DENOMS.UUSD });
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

      const lendingBalanceDec = toDecimals(balance, aTerraToken.decimals);
      let lending = null;
      if (lendingBalanceDec > 0) {
        const totalDeposit = lendingBalanceDec * Number(exchange_rate);

        lending = this.getLendingObj(
          addressProvider,
          aTerraToken,
          totalDeposit,
          tokenPrices.prices,
          lendingApy,
        );
      }
      const borrowAmountDec = toDecimals(loan_amount, aTerraToken.decimals);
      let borrowing = null;
      // eslint-disable-next-line camelcase
      if (loan_amount > 0) {
        borrowing = this.getLendingObj(
          addressProvider,
          aTerraToken,
          borrowAmountDec,
          tokenPrices.prices,
        );
      }
      const pendingRewardsDec = toDecimals(pending_rewards, ancToken.decimals);
      let claimable = null;
      // eslint-disable-next-line camelcase
      if (pending_rewards > 0) {
        claimable = plainToClass(IntegrationClaimableTokenDto, {
          address: ancToken.address.toLowerCase(),
          decimals: ancToken.decimals,
          name: ancToken.name,
          symbol: ancToken.symbol,
          price: tokenPrices.prices[ancToken.address.toLowerCase()],
          claimableData: plainToClass(ClaimableDto, {
            balance: pendingRewardsDec,
            value: new BigNumber(pendingRewardsDec) //
              .multipliedBy(tokenPrices.prices[ancToken.address.toLowerCase()])
              .toNumber(),
          }),
        });
      }
      return [lending, borrowing, claimable];
    } catch (e) {
      this.logger.error(e, 'getLendingAndBorrowingData');
    }
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
      apy: apy || null,
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
