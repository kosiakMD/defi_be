import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListProtocolsDTO {
  @ApiProperty()
  website: string;

  @ApiPropertyOptional()
  name?: string;
}
