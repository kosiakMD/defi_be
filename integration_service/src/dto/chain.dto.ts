import { ApiProperty } from '@nestjs/swagger';

export class ChainDto {
  @ApiProperty({ type: Number })
  id: number;

  @ApiProperty({ type: String })
  name: string;
}
