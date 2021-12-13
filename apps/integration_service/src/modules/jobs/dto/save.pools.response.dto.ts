import { ApiProperty } from '@nestjs/swagger';

export class SavePoolsResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  success: boolean;
  @ApiProperty({ type: Number, example: 9 })
  count: number;
}
