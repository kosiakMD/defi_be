import { ApiProperty } from '@nestjs/swagger';

import { EndpointDto } from './endpoint.dto';

export class EndpointsListDto {
  @ApiProperty({ type: [EndpointDto] })
  items: EndpointDto[];
}
