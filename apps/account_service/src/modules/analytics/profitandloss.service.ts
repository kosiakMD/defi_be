import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/Logger/Logger.service';
import { ResultStatus } from '@app/common/enum';

import { PriceServiceResponse } from '../../common/interfaces/prices.comon.interfaces';
import { HistoricalPricesMap } from '../../common/providers/microservices/price/dto/price.response.dto';
import { PriceService } from '../../common/providers/microservices/price/price.service';
import { decimalsAmount } from '../../common/utils';
import { SECONDS_IN_DAY } from '../../common/utils/time';

import { AssetsService } from '../assets/assets.service';
import { AssetsEntity } from '../assets/entities/assets.entity';
import { BlacklistService } from '../blacklists/blacklist.service';
import { TransferEntityNew } from '../transfers/entities/transfers.entity';
import { TransfersService } from '../transfers/transfers.service';
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
    // if (!asset.isAnalyticAvailable) {
    //   response.errors.push(`Asset with address ${assetAddress} is not ready`); // TODO: new assets service doesn't have analytics
    // }
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
    transfers.sort((t1, t2) => {
      return Number(t1.blockTimeStamp) - Number(t2.blockTimeStamp);
    });
    const fromTimestamp = Number(transfers[0].blockTimeStamp);
    const assetTimestamps = {
      address: asset.address,
      timestamps: [
        ...transfers.map((t) => Number(t.blockTimeStamp)),
        currentTimestamp,
        timestamp24hAgo,
      ],
    };
    const priceData = await this.assetsService.getMultipleHistoricalPrices(
      [assetTimestamps],
      chain,
    );
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
    priceData,
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
    const tokenBalanceStartValue =
      tokenBalanceStart * priceData.prices.get(asset.address)[fromTimestamp];

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
    const tokenBalanceEndValue =
      (tokenBalanceStart + tokenSimpleReceiveTotal - tokenSimpleSendTotal) *
      priceData.prices.get(asset.address)[toTimestamp];
    const tokenBalanceChangeValue = tokenBalanceEndValue - tokenBalanceStartValue;
    const tokenNetReceiveValueTotal = tokenSimpleReceiveValueTotal - tokenSimpleSendValueTotal;
    const profitAndLoss: number = tokenBalanceChangeValue - tokenNetReceiveValueTotal;
    return {
      profitAndLoss: Number(profitAndLoss.toFixed(8)),
      averageCost: Number(tokenSimpleReceiveWeightedPrice.toFixed(8)),
    };
  }
}
