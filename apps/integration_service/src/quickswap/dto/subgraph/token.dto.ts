import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TokenDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  symbol: string;

  @Expose()
  decimals: string;
}
