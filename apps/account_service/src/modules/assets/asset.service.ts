import {
  ScanTransfer,
  TransfersResponse,
} from '../../common/interfaces/transfers.common.interfaces';
import { mergeTransfersResponse } from '../../common/utils';

import { WETH } from '../approvals/contracts/WETH';

export class AssetService {
  constructor(protected readonly wrappedEther: WETH) {}

  async getConvertedTransfers(addresses: string[]): Promise<TransfersResponse<ScanTransfer>> {
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
