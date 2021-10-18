import { Exclude, Expose, Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common/types';

import { UserDto } from './user.dto';

@Exclude()
export class OwnerDto {
  @Expose()
  @ApiProperty({ example: '0x64850f38e800e04ef773efca8fcafdcefe977f9d' })
  address: Address;

  @Expose()
  @Type(() => UserDto)
  @ApiProperty({ type: UserDto })
  user: UserDto;

  @Expose({ name: 'profile_img_url' })
  @ApiProperty({ example: 'https://storage.googleapis.com/opensea-static/opensea-profile/18.png' })
  profileImageUrl: string;
}
