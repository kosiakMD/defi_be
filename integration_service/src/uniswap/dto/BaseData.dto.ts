import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import {Base} from "../../interfaces/transactions.interfaces";

export default class BaseDataDto<T = string> implements Base<T> {
  @ApiProperty({ type: Number })
  @IsString()
  chainId: number;

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
