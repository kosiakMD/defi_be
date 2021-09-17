import { Exclude, Expose, Type } from 'class-transformer';

import { SubgraphPairsDto } from '.';
import { SubgraphResponseBase } from '../../interfaces/subgraph.response.base';
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
