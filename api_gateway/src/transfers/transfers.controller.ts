import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../common/Logger/Logger.service';
import { BscScanService } from '../scans-api/modules/bscscan/bsc-scan.service';
import { EtherScanService } from '../scans-api/modules/etherscan/ether-scan.service';
import { TransferQueryDto, TransfersResponseDto } from './transfers.dto';
import { TransfersResponse } from './transfers.interfaces';
import { TransfersService } from './transfers.service';
import { AccountService } from '../account/account.service';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
  constructor(
    private service: AccountService,
    private transfersService: TransfersService,
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
  async get(@Query() query: TransferQueryDto): Promise<TransfersResponse> {
    try {
      const { chains, addresses } = query;
      return this.service.getTransfers(addresses, chains);
      // return await this.transfersService.getTransfers(addresses, chains);
    } catch (e) {
      this.logger.error(e, 'TransfersController.get');
      throw e;
    }
  }
}
