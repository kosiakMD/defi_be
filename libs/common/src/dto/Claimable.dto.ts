import { ApiProperty } from '@nestjs/swagger';

export class ClaimableDto {
  @ApiProperty({ type: String, example: '1.23413' })
  balance: string = null;
  @ApiProperty({ type: String, example: '123413' })
  value: number = null;
  @ApiProperty({ type: String, example: '1.23413' })
  lockedBalance?: string;
  @ApiProperty({ type: String, example: '123413' })
  lockedValue?: number;
}
