import { ApiProperty } from '@nestjs/swagger';

export class ListProtocolsDTO {
  @ApiProperty()
  protocol: string;

  @ApiProperty()
  chain: string;
}
