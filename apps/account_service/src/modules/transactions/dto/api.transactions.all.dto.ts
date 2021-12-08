import { ApiProperty } from '@nestjs/swagger';

import { TransactionsAllDto } from './transactions.all.dto';

export class ApiTransactionsAllResponseDto {
  @ApiProperty({ type: TransactionsAllDto, isArray: true })
  '0x7Aa3e6a7933971423a2B7141B9a8cA5e5B2E8686': TransactionsAllDto;
}
