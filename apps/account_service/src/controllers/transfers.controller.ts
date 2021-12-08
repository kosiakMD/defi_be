import { Controller, Get, Query } from '@nestjs/common';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ChainIdEnum } from '@app/common/enum';

import {
  TransfersDetailedResponseDto,
  TransfersQueryDto,
} from '../modules/transfers/dto/transfers.dto';
import { TransfersService } from '../modules/transfers/transfers.service';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transactionService: TransfersService) {}

  @Get('/')
  @ApiQuery({
    name: 'internal',
    type: Number,
    description: 'either internal data or not',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'chains',
    enum: ChainIdEnum,
    enumName: 'ChainIdEnum',
    isArray: true,
    description: 'Array of chain ID',
    example: [ChainIdEnum.eth, ChainIdEnum.bsc],
    required: false,
  })
  @ApiQuery({
    name: 'addresses',
    type: String,
    isArray: true,
    description: 'Array of address',
    example: [
      '0x0000000000000000000000000000000000000000',
      '0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7',
    ],
  })
  @ApiResponse({ status: 200, type: TransfersDetailedResponseDto })
  async getTransfersByAddresses(
    @Query() query: TransfersQueryDto,
  ): Promise<TransfersDetailedResponseDto> {
    const { addresses } = query;
    return this.transactionService.getAllTransactionDataByAddress(addresses);
  }
}
