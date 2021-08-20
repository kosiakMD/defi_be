import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Controller, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Logger } from 'src/common/Logger/Logger.service';
import { Address } from 'src/common/interfaces';

import { BscScanService } from '../scans-api/modules/bscscan/bsc-scan.service';
import { EtherScanService } from '../scans-api/modules/etherscan/ether-scan.service';
import { ScanService } from '../scans-api/modules/scan.service';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../scans-api/modules/utils/utils';
import { TransfersResponse } from './transfers.interfaces';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersService {
  private readonly chainToScan: Record<number, ScanService>;

  constructor(
    private etherScanService: EtherScanService,
    private bscScanService: BscScanService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.chainToScan = {
      [CHAIN_ID_ETH]: this.etherScanService,
      [CHAIN_ID_BSC]: this.bscScanService,
    };
  }

  public combineResults = (resultArray, chainArray): any => {
    const chainKeys = Object.keys(chainArray);
    if (chainArray && chainKeys.length > 0) {
      for (const transfer of chainKeys) {
        if (Object.keys(resultArray).includes(transfer)) {
          resultArray[transfer] = resultArray[transfer].concat(chainArray[transfer]);
        } else {
          resultArray[transfer] = chainArray[transfer];
        }
      }
    }
  };

  async getTransfers(addresses: Address[], chains: number[]): Promise<TransfersResponse> {
    // return this.service.getTransfers(addresses, chains);
    // TODO: move logic into Service!
    const transfers: TransfersResponse = {};
    const handleScan = async (service: ScanService, addresses: Address[]): Promise<boolean> => {
      const transfersResponse = await service.getTransfersByAddresses(addresses);
      // const transfersResult = await service.checkTransferResponse(transfersResponse, addresses);
      const transfersResult = await service.toTransfersResponse(transfersResponse, addresses);
      this.combineResults(transfers, transfersResult);
      return true;
    };

    let scans: ScanService[];
    if (chains && chains.length) {
      scans = chains.map((chainId) => this.chainToScan[chainId]);
    } else {
      scans = Object.values(this.chainToScan);
    }
    await Promise.allSettled(scans.map((scan) => handleScan(scan, addresses)));

    return transfers;
  }
}
