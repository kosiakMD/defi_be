import { Inject } from '@nestjs/common';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AccountService } from '../account/account.service';
import { Logger } from '../common/Logger/Logger.service';
import { BscScanService } from '../scans-api/modules/bscscan/bsc-scan.service';
import { EtherScanService } from '../scans-api/modules/etherscan/ether-scan.service';
import { ScanService } from '../scans-api/modules/scan.service';
import { TransfersResponseDto } from './transfers.dto';
import { TransfersResponse } from './transfers.interfaces';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
  constructor(
    private service: AccountService,
    private etherScanService: EtherScanService,
    private bscScanService: BscScanService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

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
  get(
    @Query('addresses') addresses: string,
    @Query('chains') chains: string,
  ): Promise<TransfersResponse> {
    // return this.service.getTransfers(addresses, chains);
    return (async (addresses, chains) => {
      const addressArray = ((addresses) => {
        const result = new Set(addresses.split(','));
        return Array.from(result);
      })(addresses);
      const transfers = {};
      if (chains && chains !== '') {
        const chainIds = chains.split(',');
        if (chainIds.includes('1')) {
          const ethTransfers = await this.etherScanService.getTransfersByAddresses(addressArray);

          if (!Number(ethTransfers['status'])) {
            this.bscScanService.combineResults(transfers, {});
          }

          const response = await this.etherScanService.toTransfersResponse(
            ethTransfers['result'],
            addressArray,
          );

          this.etherScanService.combineResults(transfers, response);
        }

        if (chainIds.includes('2')) {
          const bscTransfers = await this.bscScanService.getTransfersByAddresses(addressArray);

          if (!Number(bscTransfers['status'])) {
            this.bscScanService.combineResults(transfers, {});
          }
          const response = await this.bscScanService.toTransfersResponse(
            bscTransfers['result'],
            addressArray,
          );

          this.bscScanService.combineResults(transfers, response);
        }
      } else {
        // TODO: move logic into Service!
        const handleScan = async (service: ScanService): Promise<boolean> => {
          const transfersResponse = await service.getTransfersByAddresses(addressArray);
          const transfersResult = await service.checkTransferResponse(
            transfersResponse,
            addressArray,
          );
          service.combineResults(transfersResult, transfers);
          return true;
        };

        await Promise.allSettled([
          handleScan(this.etherScanService),
          handleScan(this.bscScanService),
        ]);

        // const [ethTransfers, bscTransfers] = await Promise.all([
        //   this.etherScanService.getTransfersByAddresses(addressArray),
        //   this.bscScanService.getTransfersByAddresses(addressArray),
        // ]);
        //
        // const [ethTransfersResponse, bscTransfersResponse] = await Promise.all([
        //   this.etherScanService.checkTransferResponse(ethTransfers, addressArray),
        //   this.bscScanService.checkTransferResponse(bscTransfers, addressArray),
        // ]);
        //
        // await Promise.all([
        //   this.etherScanService.combineResults(transfers, ethTransfersResponse),
        //   this.bscScanService.combineResults(transfers, bscTransfersResponse),
        // ]);
      }

      const allTransfersResponse: TransfersResponse = {};

      Object.keys(transfers).forEach((key) => {
        allTransfersResponse[key] = transfers[key];
      });

      return allTransfersResponse;
    })(addresses, chains);
  }
}
