import { ApiProperty } from '@nestjs/swagger';

import { TransactionDto } from './transaction.dto';

export class ApiTransactionsResponseDto {
  @ApiProperty({ type: TransactionDto, isArray: true })
  '0x7Aa3e6a7933971423a2B7141B9a8cA5e5B2E8686': TransactionDto;
}
