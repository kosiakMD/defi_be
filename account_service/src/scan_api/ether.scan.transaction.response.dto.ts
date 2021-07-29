import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { EtherScanResponseDto } from './ether.scan.response.dto';
import { EtherScanTransactionDto } from './ether.scan.transaction.dto';

export class EtherScanTransactionResponseDto extends EtherScanResponseDto<
  EtherScanTransactionDto[]
> {
  @Type(() => EtherScanTransactionDto)
  @ApiProperty({ type: [EtherScanTransactionDto] })
  result;

  constructor(transactionResponse: Partial<EtherScanTransactionResponseDto>) {
    super();
    Object.assign(this, transactionResponse);
  }
}
