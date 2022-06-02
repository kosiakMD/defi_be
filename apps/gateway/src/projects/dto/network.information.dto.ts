import { ApiProperty } from '@nestjs/swagger';

export class NetworkInformationDto {
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @ApiProperty({ type: String, example: 'Ethereum' })
  name: string;

  @ApiProperty({ type: Number, example: 35 })
  count: number;
}
