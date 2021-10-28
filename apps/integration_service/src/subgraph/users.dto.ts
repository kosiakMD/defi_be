import { Exclude, Expose } from 'class-transformer';

import { UserDto } from './user.dto';

@Exclude()
export class UsersDto {
  @Expose()
  users: UserDto[];
}
