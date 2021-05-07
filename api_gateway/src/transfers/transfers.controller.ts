import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AccountService } from '../account/account.service';
import { Logger } from '../common/Logger/Logger.service';
import { Address } from '../common/interfaces';
import { BscScanService } from '../scans-api/modules/bscscan/bsc-scan.service';
import { EtherScanService } from '../scans-api/modules/etherscan/ether-scan.service';
import { ScanService } from '../scans-api/modules/scan.service';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../scans-api/modules/utils/utils';
import { TransferQueryDto, TransfersResponseDto } from './transfers.dto';
import { TransfersResponse } from './transfers.interfaces';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
  private chainToScan: Record<number, ScanService>;

  constructor(
    private service: AccountService,
    private etherScanService: EtherScanService,
    private bscScanService: BscScanService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {
    this.chainToScan = {
      [CHAIN_ID_ETH]: this.etherScanService,
      [CHAIN_ID_BSC]: this.bscScanService,
    };
  }

  @Get('/')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example: '0x0000000000000000000000000000000000000000',
  })
  @ApiQuery({
    name: 'chains',
    type: String,
    required: false,
    description: `Array of chains' IDs (comma separated)`,
    // example: '1,2',
    example: '',
  })
  @ApiResponse({ status: 200, type: TransfersResponseDto })
  async get(@Query() query: TransferQueryDto): Promise<TransfersResponse> {
    const { chains, addresses } = query;
    // return this.service.getTransfers(addresses, chains);
    // TODO: move logic into Service!
    const transfers: TransfersResponse = {};
    const handleScan = async (service: ScanService, addresses: Address[]): Promise<boolean> => {
      const transfersResponse = await service.getTransfersByAddresses(addresses);
      const transfersResult = await service.checkTransferResponse(transfersResponse, addresses);
      service.combineResults(transfers, transfersResult);
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
