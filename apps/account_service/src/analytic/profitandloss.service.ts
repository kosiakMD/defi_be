import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ResultStatus } from '@app/common/enum';

import { AssetsService } from '../assets/assets.service';
import { AssetsEntity } from '../assets/entity/assets.entity';
import { HistoricalPricesMap } from '../balance/dto/price.response.dto';
import { BlacklistService } from '../blacklist/blacklist.service';
import { PriceServiceResponse } from '../price/price.interfaces';
import { PriceService } from '../price/price.service';
import { TransferEntityNew } from '../transfers/dto/transfers.entity';
import { TransfersService } from '../transfers/transfers.service';
import { SECONDS_IN_DAY } from '../utils/time';
import { decimalsAmount } from '../utils/utils';
import { ProfitAndLoss } from './dto/profitAndLoss';
import { ProfitAndLossResponseDTO } from './dto/profitandloss.response.dto';

@Injectable()
export class ProfitAndLossService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsService: AssetsService,
    private readonly transfersService: TransfersService,
    private readonly priceService: PriceService,
    private readonly blacklistedService: BlacklistService,
  ) {}
  async getProfitAndLoss(
    assetAddress: string,
    chain: number,
    addresses: string[],
  ): Promise<ProfitAndLossResponseDTO> {
    const response = new ProfitAndLossResponseDTO({
      status: ResultStatus.ok,
      errors: [],
      data: null,
    });
    // better to find and validate asset first
    const asset: AssetsEntity = await this.assetsService.findByAddressAndChain(assetAddress, chain);
    if (!asset) {
      response.errors.push(`Asset with address ${assetAddress} not found`);
    }
    if (!asset.isAnalyticAvailable) {
      response.errors.push(`Asset with address ${assetAddress} is not ready`);
    }
    const addressBlacklisted: string[] = await this.blacklistedService.filterIsBlacklisted(
      addresses,
    );
    if (addressBlacklisted.length > 0) {
      response.errors.push(`Found blacklisted addresses: ${addressBlacklisted.join(',')}`);
    }
    if (response.errors.length > 0) {
      response.status = ResultStatus.error;
      return response;
    }
    const transfers: TransferEntityNew[] = await this.transfersService.queryAssetTransfers(
      asset,
      addresses,
    );
    response.data = new ProfitAndLoss({
      profitAndLoss: 0,
      profitAndLoss24h: 0,
      averageCost: 0,
    });
    if (transfers.length === 0) {
      return response;
    }

    const currentTimestamp: number = Math.floor(Date.now() / 1000);
    const timestamp24hAgo: number = currentTimestamp - SECONDS_IN_DAY;
    const assetTimestamps = {
      address: asset.address,
      timestamps: [...transfers.map((t) => t.blockTimeStamp), currentTimestamp, timestamp24hAgo],
    };
    transfers.sort((t1, t2) => {
      return Number(t1.blockTimeStamp) - Number(t2.blockTimeStamp);
    });
    const fromTimestamp = Number(transfers[0].blockTimeStamp);
    const priceData = await this.priceService.getHistoricalPrices([assetTimestamps], chain);
    const plTotal = this.calculateProfitAndLoss(
      asset,
      transfers,
      addresses,
      priceData,
      fromTimestamp,
      currentTimestamp,
    );

    const pl24 = this.calculateProfitAndLoss(
      asset,
      transfers,
      addresses,
      priceData,
      timestamp24hAgo,
      currentTimestamp,
    );
    response.data.profitAndLoss = plTotal.profitAndLoss;
    response.data.profitAndLoss24h = pl24.profitAndLoss;
    response.data.averageCost = plTotal.averageCost;
    return response;
  }

  private calculateProfitAndLoss(
    asset: AssetsEntity,
    transfers: TransferEntityNew[],
    addresses: string[],
    priceData: PriceServiceResponse<HistoricalPricesMap>,
    fromTimestamp: number,
    toTimestamp: number,
  ): any {
    let transfersForBalanceStart: TransferEntityNew[] = [];
    let transfersForProfitAndLoss: TransferEntityNew[] = [];
    transfers.forEach((transfer) => {
      if (Number(transfer.blockTimeStamp) < fromTimestamp) {
        transfersForBalanceStart = [...transfersForBalanceStart, transfer];
      }
      if (
        Number(transfer.blockTimeStamp) >= fromTimestamp &&
        Number(transfer.blockTimeStamp) <= toTimestamp
      ) {
        transfersForProfitAndLoss = [...transfersForProfitAndLoss, transfer];
      }
    });

    const setOfAddresses = new Set<string>();
    addresses.forEach((a) => setOfAddresses.add(a));

    let tokenBalanceStart = 0;
    let tokenBalanceStartValue = 0;
    transfersForBalanceStart.forEach((transfer) => {
      const amount = decimalsAmount(transfer.amount, asset.decimals);
      if (setOfAddresses.has(transfer.fromAddress)) {
        tokenBalanceStart -= amount;
      }
      // this means receive
      if (setOfAddresses.has(transfer.toAddress)) {
        tokenBalanceStart += amount;
      }
    });
    tokenBalanceStartValue = tokenBalanceStart * priceData.prices.get(asset.address)[fromTimestamp];

    let tokenBalanceEndValue = 0;
    let tokenBalanceChangeValue = 0;
    let tokenNetReceiveValueTotal = 0;
    // send values
    let tokenSimpleSendTotal = 0;
    let tokenSimpleSendValueTotal = 0;

    // receive values
    let tokenSimpleReceiveTotal = 0;
    let tokenSimpleReceiveWeightedPrice = 0;
    let tokenSimpleReceiveValueTotal = 0;

    transfersForProfitAndLoss.forEach((transfer) => {
      const amount = decimalsAmount(transfer.amount, asset.decimals);
      // this means send
      if (setOfAddresses.has(transfer.fromAddress)) {
        tokenSimpleSendTotal += amount;
        tokenSimpleSendValueTotal +=
          amount * priceData.prices.get(asset.address)[transfer.blockTimeStamp];
      }
      // this means receive
      if (setOfAddresses.has(transfer.toAddress)) {
        tokenSimpleReceiveTotal += amount;
        tokenSimpleReceiveValueTotal +=
          amount * priceData.prices.get(asset.address)[transfer.blockTimeStamp];
      }
    });
    tokenSimpleReceiveWeightedPrice =
      tokenSimpleReceiveTotal !== 0 ? tokenSimpleReceiveValueTotal / tokenSimpleReceiveTotal : 0;
    tokenBalanceEndValue =
      (tokenBalanceStart + tokenSimpleReceiveTotal - tokenSimpleSendTotal) *
      priceData.prices.get(asset.address)[toTimestamp];
    tokenBalanceChangeValue = tokenBalanceEndValue - tokenBalanceStartValue;
    tokenNetReceiveValueTotal = tokenSimpleReceiveValueTotal - tokenSimpleSendValueTotal;
    const profitAndLoss: number = tokenBalanceChangeValue - tokenNetReceiveValueTotal;
    return {
      profitAndLoss: Number(profitAndLoss.toFixed(8)),
      averageCost: Number(tokenSimpleReceiveWeightedPrice.toFixed(8)),
    };
  }
}
