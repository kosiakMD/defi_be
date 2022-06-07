import { ApiProperty } from '@nestjs/swagger';

export class AddressCandidateDto {
  @ApiProperty()
  address: string;

  @ApiProperty()
  chainId: number;
}
