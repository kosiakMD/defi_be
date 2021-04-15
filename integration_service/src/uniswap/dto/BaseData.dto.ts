import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { Base } from '../uniswap.interfaces';

export default class BaseDataDto<T = string> implements Base<T> {
  @ApiProperty({ type: String })
  @IsString()
  userAddress: string;

  @ApiProperty({ type: String })
  @IsString()
  protocolName: string;

  @ApiProperty({ type: String })
  @IsString()
  protocolType: T;
}
