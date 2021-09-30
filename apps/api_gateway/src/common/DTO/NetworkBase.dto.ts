import { ApiProperty } from '@nestjs/swagger';

export class NetworkBaseDto {
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @ApiProperty({ type: String, example: 'Ethereum' })
  name: string;
}
