import { Inject } from '@nestjs/common';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AccountService } from '../account/account.service';
import { Logger } from '../common/Logger/Logger.service';
import { BscscanService } from '../scans-api/modules/bscscan/bscscan.service';
import { EtherscanService } from '../scans-api/modules/etherscan/etherscan.service';
import { TransfersResponseDto } from './transfers.dto';
import { TransfersResponse } from './transfers.interfaces';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
  constructor(
    private service: AccountService,
    private etherscanService: EtherscanService,
    private bscscanService: BscscanService,
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
          const ethTransfers = await this.etherscanService.getTransfersByAddresses(addressArray);

          if (!Number(ethTransfers['status'])) {
            this.bscscanService.combineResults(transfers, {});
          }

          const response = await this.etherscanService.toTransfersResponse(
            ethTransfers['result'],
            addressArray,
          );

          this.etherscanService.combineResults(transfers, response);
        }

        if (chainIds.includes('2')) {
          const bscTransfers = await this.bscscanService.getTransfersByAddresses(addressArray);

          if (!Number(bscTransfers['status'])) {
            this.bscscanService.combineResults(transfers, {});
          }
          const response = await this.bscscanService.toTransfersResponse(
            bscTransfers['result'],
            addressArray,
          );

          this.bscscanService.combineResults(transfers, response);
        }
      } else {
        const [ethTransfers, bscTransfers] = await Promise.all([
          this.etherscanService.getTransfersByAddresses(addressArray),
          this.bscscanService.getTransfersByAddresses(addressArray),
        ]);

        const [ethTransfersResponse, bscTransfersResponse] = await Promise.all([
          this.etherscanService.checkTransferResponse(ethTransfers, addressArray),
          this.bscscanService.checkTransferResponse(bscTransfers, addressArray),
        ]);

        await Promise.all([
          this.etherscanService.combineResults(transfers, ethTransfersResponse),
          this.bscscanService.combineResults(transfers, bscTransfersResponse),
        ]);
      }

      const allTransfersResponse: TransfersResponse = {};

      Object.keys(transfers).forEach((key) => {
        allTransfersResponse[key] = transfers[key];
      });

      return allTransfersResponse;
    })(addresses, chains);
  }
}
