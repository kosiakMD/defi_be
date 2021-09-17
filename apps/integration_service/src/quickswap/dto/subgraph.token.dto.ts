import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class SubgraphTokenDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  symbol: string;

  @Expose()
  decimals: string;
}
