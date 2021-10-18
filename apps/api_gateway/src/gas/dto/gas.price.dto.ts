import { Exclude, Expose, Transform } from 'class-transformer';

const toWei = (v: number) => v * 1e8;

@Exclude()
export class GasPriceDto {
  @Expose({ name: 'fastest' })
  @Transform(({ value }) => toWei(value))
  rapid: number;

  @Expose()
  @Transform(({ value }) => toWei(value))
  fast: number;

  @Expose({ name: 'average' })
  @Transform(({ value }) => toWei(value))
  standard: number;

  @Expose({ name: 'safeLow' })
  @Transform(({ value }) => toWei(value))
  slow: number;

  @Expose()
  timestamp: number;
}
