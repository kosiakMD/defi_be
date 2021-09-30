import { ApiProperty } from '@nestjs/swagger';
import { EtherScanMessageEnum, EtherScanStatusEnum } from 'src/common/enum';

export class EtherScanResponseDto<T = any> {
  @ApiProperty({
    enum: EtherScanStatusEnum,
    enumName: 'EtherScanStatus',
    example: EtherScanStatusEnum.ok,
  })
  status: string;

  @ApiProperty({
    enum: EtherScanMessageEnum,
    enumName: 'EtherScanMessage',
    example: EtherScanMessageEnum.ok,
  })
  message: string;

  @ApiProperty({ type: Object })
  result: T;
}
