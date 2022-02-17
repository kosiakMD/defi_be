import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TraitDto {
  @Expose({ name: 'trait_type' })
  type: string = null;

  @Expose()
  value: string = null;

  @Expose({ name: 'max_value' })
  maxValue: string = null;

  @Expose({ name: 'trait_count' })
  count: number = null;

  @Expose({ name: 'display_type' })
  displayType: string = null;

  @Expose()
  percentageOfOwners?: number = null;
}
