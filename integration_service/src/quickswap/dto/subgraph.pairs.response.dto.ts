import { Exclude, Expose, Type } from 'class-transformer';
import { SubgraphResponseBase } from 'src/interfaces/subgraph.response.base';

import { SubgraphPairsDto } from '.';
import { SubgraphErrorResponseDto } from './subgraph.error.response.dto';

@Exclude()
export class SubgraphPairsResponseDto implements SubgraphResponseBase<SubgraphPairsDto> {
  @Expose()
  @Type(() => SubgraphPairsDto)
  data: SubgraphPairsDto;

  @Expose()
  @Type(() => SubgraphErrorResponseDto)
  errors: SubgraphErrorResponseDto[];
}
