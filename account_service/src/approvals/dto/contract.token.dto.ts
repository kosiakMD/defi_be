import { ApiProperty } from '@nestjs/swagger';

export class ContractTokenDto {
  @ApiProperty({ type: String, example: '0x86a91b50af95ff1d9d53ca1e4963ef06d8b31369' })
  id: string;

  @ApiProperty({
    type: String,
    example: 'https://i.pinimg.com/originals/75/98/d1/7598d103a735d5568964e4967e42823d.gif',
  })
  icon: string;

  @ApiProperty({ type: String, example: 'Matic Token' })
  name: string;

  @ApiProperty({ type: String, example: 'MATIC' })
  symbol: string;

  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
}
