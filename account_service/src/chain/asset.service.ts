import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Logger } from '../Logger/Logger.service';
import { TransfersResponse } from '../transfers/interfaces/transfers.interfaces';
import { mergeTransfersResponse } from '../utils/utils';
import { WETH } from './contracts/WETH';

@Injectable()
export class AssetService {
  constructor(
    protected readonly configService: ConfigService,
    protected readonly logger: Logger,
    protected readonly wrappedEther: WETH,
  ) {}

  async getConvertedTransfers(addresses: string[]): Promise<TransfersResponse> {
    // TODO: add try catch, add caching
    const [deposits, withdrawals] = await Promise.all([
      this.wrappedEther.depositEvents(addresses),
      this.wrappedEther.withdrawalEvents(addresses),
    ]);

    const depositTransfers = WETH.depositsToTransfersResponse(deposits);
    const withdrawalTransfers = WETH.withdrawalsToTransfersResponse(withdrawals);

    return mergeTransfersResponse(addresses, depositTransfers, withdrawalTransfers);
  }
}
