import { ApiProperty } from '@nestjs/swagger';

export class AssetsGetBulkDto {
  @ApiProperty()
  chainId: number;

  @ApiProperty()
  address: string;
}
