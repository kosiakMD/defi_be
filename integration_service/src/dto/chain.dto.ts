import { ApiProperty } from '@nestjs/swagger';

export class ChainDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
}
