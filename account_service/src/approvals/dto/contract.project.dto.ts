import { ApiProperty } from '@nestjs/swagger';

export class ContractProjectDto {
  @ApiProperty({ type: Number, example: 18 })
  id: number;

  @ApiProperty({ type: String, example: 'uniswap' })
  name: string;

  @ApiProperty({
    type: String,
    example:
      'https://admapidev2.defiyield.info/projects/icons/92b6da7e9748da25ffd9a9a671351a32.png',
  })
  icon: string;

  @ApiProperty({ type: String, example: 'UniSwap V2' })
  description: string;
}
