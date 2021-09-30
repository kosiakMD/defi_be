import { ApiProperty } from '@nestjs/swagger';

import { TransactionAllDto } from './transaction.all.dto';

export class ApiTransactionsAllResponseDto {
  @ApiProperty({ type: TransactionAllDto, isArray: true })
  '0x7Aa3e6a7933971423a2B7141B9a8cA5e5B2E8686': TransactionAllDto;
}
