import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class NetworkInformationDto {
  @Expose()
  @ApiProperty({ type: Number, example: 1 })
  id: number;

  @Expose({ name: 'networkName' })
  @ApiProperty({ type: String, example: 'Ethereum' })
  name: string;

  @Expose({ name: 'networkCount' })
  @ApiProperty({ type: Number, example: 35 })
  count: number;
}
