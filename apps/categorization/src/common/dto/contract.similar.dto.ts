import { ApiProperty } from '@nestjs/swagger';

export class ContractSimilarDto {
  @ApiProperty({ type: String, example: '0x6dDb25ca46656767f8f2385D653992dC1cdb4470' })
  address: string;

  @ApiProperty({ type: Number, example: 0.432 })
  abiCodeSimilarity: number;

  @ApiProperty({ type: Number, example: 0.82 })
  abiJsonSimilarity: number;

  @ApiProperty({ type: Object, example: { matchedMethodsCount: 7, templateMethodsCount: 7 } })
  metadata: object;

  @ApiProperty({
    type: Number,
    example: { name: 'TendieSwap', url: 'https://www.tendieswap.org', tvl: '257783.0618425319' },
  })
  protocol: { name: string; url: string; tvl: string };

  @ApiProperty({ type: String, example: 'ethereum' })
  chain: string;
}
