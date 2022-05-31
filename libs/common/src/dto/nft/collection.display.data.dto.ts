import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class CollectionDisplayDataDto {
  @Expose({ name: 'card_display_style' })
  @ApiProperty({ example: 'contain' })
  cardDisplayStyle: string = null;
}
