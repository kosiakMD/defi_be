import { ApiProperty } from '@nestjs/swagger';

import { TransactionsDto } from './transactions.dto';

export class ApiTransactionsResponseDto {
  @ApiProperty({ type: TransactionsDto, isArray: true })
  '0x7Aa3e6a7933971423a2B7141B9a8cA5e5B2E8686': TransactionsDto;
}
