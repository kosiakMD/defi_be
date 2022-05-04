import { ApiProperty } from '@nestjs/swagger';

import { EndpointDto } from './Endpoint.dto';

export class EndpointsListDto {
  @ApiProperty({ type: [EndpointDto] })
  items: EndpointDto[];
}
