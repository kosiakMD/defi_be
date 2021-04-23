import { ApiProperty } from '@nestjs/swagger';

export class ChainDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ethereum' })
  name: string;
}