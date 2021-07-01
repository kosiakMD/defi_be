import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AccountService } from '../account/account.service';
import { Logger } from '../common/Logger/Logger.service';
import { BscScanService } from '../scans-api/modules/bscscan/bsc-scan.service';
import { EtherScanService } from '../scans-api/modules/etherscan/ether-scan.service';
import { TransferQueryDto, TransfersDetailedResponseDto } from './transfers.dto';
import { TransfersResponse } from './transfers.interfaces';
import { TransfersService } from './transfers.service';

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
    name: 'chains',
    type: String,
    required: false,
    description: 'Array of chain ID (comma separated)',
    example: '1,2',
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Address (comma separated)',
    example:
      '0xbddab785b306bcd9fb056da189615cc8ece1d823,0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
  })
  @ApiResponse({ status: 200, type: TransfersDetailedResponseDto })
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
