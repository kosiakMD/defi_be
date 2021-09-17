import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SubgraphErrorResponseDto {
  @Expose()
  message: string;
}
