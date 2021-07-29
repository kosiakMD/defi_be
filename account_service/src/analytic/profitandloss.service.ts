import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../Logger/Logger.service';
import { AssetsEntity } from '../assets/assets.entity';
import { AssetsService } from '../assets/assets.service';
import { CHAIN_ID_ETH } from '../common/constatnt';
import { PriceService } from '../price/price.service';
import { TransferEntityNew } from '../transfers/dto/transfers.entity';
import { TransfersService } from '../transfers/transfers.service';
import { decimalsAmount } from '../utils/utils';

@Injectable()
export class ProfitAndLossService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly assetsService: AssetsService,
    private readonly transfersService: TransfersService,
    private readonly priceService: PriceService,
  ) {}
  async getProfitAndLoss(assetAddress: string, addresses: string[]): Promise<any> {
    // better to find and validate asset first
    const asset: AssetsEntity = await this.assetsService.findByAddressAndChain(
      assetAddress,
      CHAIN_ID_ETH,
    );
    if (!asset) {
      throw new NotFoundException(`Asset with address ${assetAddress} not found`);
    }
    if (!asset.isMigrated) {
      throw new NotFoundException(`Asset with address ${assetAddress} is not ready`);
    }
    const transfers: TransferEntityNew[] = await this.transfersService.queryAssetTransfers(
      asset,
      addresses,
    );

    const currentTimestamp: number = Math.floor(Date.now() / 1000);
    const assetTimestamps = {
      address: asset.address,
      timestamps: [...transfers.map((t) => t.blockTimeStamp), currentTimestamp],
    };
    const priceData = await this.priceService.getHistoricalPrices([assetTimestamps], CHAIN_ID_ETH);

    const tokenBalanceStartValue = 0;
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

    const setOfAddresses = new Set<string>();
    addresses.forEach((a) => setOfAddresses.add(a));

    transfers.forEach((transfer) => {
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
      (tokenSimpleReceiveTotal - tokenSimpleSendTotal) *
      priceData.prices.get(asset.address)[currentTimestamp];
    tokenBalanceChangeValue = tokenBalanceEndValue - tokenBalanceStartValue;

    tokenNetReceiveValueTotal = tokenSimpleReceiveValueTotal - tokenSimpleSendValueTotal;

    const profitAndLoss: number = tokenNetReceiveValueTotal - tokenBalanceChangeValue;

    return {
      profitAndLoss: Number(profitAndLoss.toFixed(8)),
      profitAndLoss24h: 0,
      averageCost: Number(tokenSimpleReceiveWeightedPrice.toFixed(8)),
    };
  }
}
