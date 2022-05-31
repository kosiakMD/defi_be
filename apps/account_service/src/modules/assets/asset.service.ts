import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common/logger/logger.service';

import {
  ScanTransfer,
  TransfersResponse,
} from '../../common/interfaces/transfers.common.interfaces';
import { mergeTransfersResponse } from '../../common/utils';

import { WETHContract } from '../approvals/contracts/weth.contract';

export class AssetService {
  constructor(
    protected readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    protected readonly wrappedEther: WETHContract,
  ) {}

  async getConvertedTransfers(addresses: string[]): Promise<TransfersResponse<ScanTransfer>> {
    // TODO: add try catch, add caching
    const [deposits, withdrawals] = await Promise.all([
      this.wrappedEther.depositEvents(addresses),
      this.wrappedEther.withdrawalEvents(addresses),
    ]);

    const depositTransfers = WETHContract.depositsToTransfersResponse(deposits);
    const withdrawalTransfers = WETHContract.withdrawalsToTransfersResponse(withdrawals);

    return mergeTransfersResponse(addresses, depositTransfers, withdrawalTransfers);
  }
}
