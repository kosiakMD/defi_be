import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TransfersResponseDto } from './dto/transfers.dto';
import { TransfersResponse } from './interfaces/transfers.interfaces';
import { TransfersService } from './transfers.service';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transactionService: TransfersService) {}

  @Get('/')
  @ApiQuery({
    name: 'addresses',
    type: String,
    description: 'Array of Addresses (comma separated)',
    example:
      '0xcff17036c5ae141f2244f480fc16ba244ffab33b,0x07471d0262b17529a489d0c696eef988f89464ac',
  })
  @ApiResponse({ status: 200, type: TransfersResponseDto })
  async getTransfersByAddresses(
    @Query('addresses') addresses: string,
  ): Promise<TransfersResponse | []> {
    if (!addresses) {
      return [];
    }
    return this.transactionService.getAllTransactionDataByAddress(addresses);
  }
}
