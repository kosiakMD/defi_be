import { ApiProperty } from '@nestjs/swagger';

export class EndpointDto {
  @ApiProperty({ type: Number, example: 1066834 })
  id: number;

  @ApiProperty({ type: Number, example: 10 })
  chainId: number;

  @ApiProperty({
    type: String,
    example: 'https://speedy-nodes-nyc.moralis.io/173c906bbd79b4c01dc6034b/eth/mainnet',
  })
  endpoint: string;

  @ApiProperty({ type: Boolean, example: true })
  isEnabled: boolean;

  @ApiProperty({ type: Number, example: 0 })
  priority: number;

  @ApiProperty({ type: Date, example: '2022-01-25T14:21:57.003' })
  createdAt: Date;

  @ApiProperty({ type: Date, example: '2022-01-25T14:21:57.004' })
  updatedAt: Date;
}
