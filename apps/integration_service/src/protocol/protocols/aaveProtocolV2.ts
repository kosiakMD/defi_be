import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Logger,
  IntegrationFeaturesDataDto,
  FeatureResultDto,
  LendingPositionDto,
  LendingErcToken,
  AaveUserReserve,
  AaveUser,
  AaveProtocolEnum,
  ChainAbbrEnum,
  ChainIdEnum,
  ProjectEnum,
  Address,
  ChainDto,
} from '@app/common';
import { WETH_ADDRESS } from '@app/common/constant';
import { normalizeDecimals } from '@app/common/utils/number';

import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import { AaveSubgraph } from '../../thegraph/aave.subgraph';
import { FeatureEnum } from '../features/features.enum';
import DataProviderProtocol from './dataProviderProtocol';
import { Mapper } from './mappers/mapper';

@Injectable()
export class AaveProtocolV2 extends DataProviderProtocol {
  readonly chains = [ChainAbbrEnum.eth, ChainAbbrEnum.plg];
  readonly project = ProjectEnum.aave;
  readonly displayName = 'Aave V2';
  readonly name = AaveProtocolEnum.AaveV2;
  readonly features = {
    [ChainAbbrEnum.eth]: [FeatureEnum.lending, FeatureEnum.borrowing],
    [ChainAbbrEnum.plg]: [FeatureEnum.lending, FeatureEnum.borrowing],
  };

  protected dataProvider;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly mapper: Mapper,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly subgraph: AaveSubgraph,
  ) {
    super();
    this.dataProvider = this;
  }

  async getAllFeaturesData(address: string, chain: ChainDto): Promise<IntegrationFeaturesDataDto> {
    const response = plainToClass(IntegrationFeaturesDataDto, {
      errors: [],
    });

    await Promise.all([
      this.getLendingAndBorrowingData(response, address.toLowerCase().split(','), chain.id),
    ]);

    return response;
  }

  async getLendingAndBorrowingData(
    response: IntegrationFeaturesDataDto,
    addresses: Address[],
    chainId: ChainIdEnum,
  ) {
    const [usersResult, ethPrice] = await Promise.all([
      this.getUserReserves(addresses, chainId),
      this.getEthPrice(),
    ]);

    if (!usersResult.length) {
      response[FeatureEnum.lending] = null;
      response[FeatureEnum.borrowing] = null;
      return;
    }

    response[FeatureEnum.lending] = this.formatLendPosition(usersResult, ethPrice);
    response[FeatureEnum.borrowing] = this.formatBorrowPosition(usersResult, ethPrice);
  }

  formatLendPosition(users: AaveUser[], ethPrice: number): FeatureResultDto<LendingPositionDto> {
    const RAY = 10 ** 27;
    let totalLendValue = 0;
    const lendPositions = [];
    users.forEach((user) => {
      user.reserves.forEach((userReserve) => {
        if (!Number(userReserve.currentATokenBalance)) return;

        const { price } = userReserve.reserve;

        const totalDepositDecimal = normalizeDecimals(
          userReserve.currentATokenBalance,
          userReserve.reserve.decimals,
        );

        const lendToken = this.getUnderlyingToken(
          userReserve,
          (price.priceInEth / 1e18) * ethPrice,
        );

        const position = {
          address: userReserve.reserve.id,
          totalDeposit: userReserve.currentATokenBalance,
          balance: totalDepositDecimal,
          value: totalDepositDecimal * lendToken.price,
          APY: 100 * (Number(userReserve.reserve.liquidityRate) / RAY),
          token: lendToken,
        };

        totalLendValue += position.value;

        lendPositions.push(position);
      });
    });

    const lending: FeatureResultDto<LendingPositionDto> = {
      totalValue: totalLendValue,
      items: lendPositions,
    };

    return lending;
  }

  formatBorrowPosition(users: AaveUser[], ethPrice: number): FeatureResultDto<LendingPositionDto> {
    const RAY = 10 ** 27;
    let totalBorrowValue = 0;
    const borrowPositions = [];

    users.forEach((user) => {
      user.reserves.forEach((userReserve) => {
        const { price } = userReserve.reserve;
        const stableDebtDecimal = normalizeDecimals(
          userReserve.currentStableDebt,
          userReserve.reserve.decimals,
        );
        const variableDebtDecimal = normalizeDecimals(
          userReserve.currentVariableDebt,
          userReserve.reserve.decimals,
        );

        const borrowToken = this.getUnderlyingToken(
          userReserve,
          (price.priceInEth / 1e18) * ethPrice,
        );

        // Stable Debt
        if (Number(userReserve.currentStableDebt)) {
          const position = {
            address: userReserve.reserve.id,
            totalDeposit: userReserve.currentStableDebt,
            balance: stableDebtDecimal,
            value: stableDebtDecimal * borrowToken.price,
            APY: 100 * (Number(userReserve.reserve.stableBorrowRate) / RAY),
            token: borrowToken,
          };
          totalBorrowValue += position.value;
          borrowPositions.push(position);
        }

        // Variable Debt
        if (Number(userReserve.currentVariableDebt)) {
          const position = {
            address: userReserve.reserve.id,
            totalDeposit: userReserve.currentVariableDebt,
            balance: variableDebtDecimal,
            value: variableDebtDecimal * borrowToken.price,
            APY: 100 * (Number(userReserve.reserve.variableBorrowRate) / RAY),
            token: borrowToken,
          };
          totalBorrowValue += position.value;
          borrowPositions.push(position);
        }
      });
    });

    const borrowing: FeatureResultDto<LendingPositionDto> = {
      totalValue: totalBorrowValue,
      items: borrowPositions,
    };
    return borrowing;
  }

  getUnderlyingToken(userReserve: AaveUserReserve, price: number): LendingErcToken {
    return plainToClass(LendingErcToken, {
      address: userReserve.reserve.underlyingAsset,
      decimals: userReserve.reserve.decimals,
      name: userReserve.reserve.name,
      symbol: userReserve.reserve.symbol,
      price,
    });
  }

  getUserReserves(addresses: string[], chainId: ChainIdEnum): Promise<AaveUser[]> {
    return this.subgraph.getUsersReserves(addresses, chainId);
  }

  async getEthPrice(): Promise<number> {
    const results = await this.priceService.getTokenPricesFetch([WETH_ADDRESS], ChainIdEnum.eth);
    return Number(results.prices[WETH_ADDRESS]);
  }
}
export default AaveProtocolV2;
