import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { BaseData } from '../interfaces';

export default class BaseDataDto<T = string> implements BaseData<T> {
  @ApiProperty({ type: String, example: '0x94dfce828c3daaf6492f1b6f66f9a1825254d24b' })
  @IsString()
  userAddress: string;

  @ApiProperty({ type: String, example: 'Curve Project' })
  @IsString()
  protocolName: string;

  @ApiProperty({ type: String })
  @IsString()
  protocolType: T;
}
