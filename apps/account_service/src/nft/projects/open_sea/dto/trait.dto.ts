import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TraitDto {
  @Expose({ name: 'trait_type' })
  type: string;

  @Expose()
  value: string | string;

  @Expose({ name: 'max_value' })
  maxValue: string;

  @Expose({ name: 'trait_count' })
  count: number;
}
