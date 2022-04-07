import { IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateAssetsCategoryDto {
  @ApiProperty({ type: String, example: 'token' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
