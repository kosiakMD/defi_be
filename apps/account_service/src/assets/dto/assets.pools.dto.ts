// eslint-disable-next-line max-classes-per-file
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { ChainIdEnum } from '../../common/enum';

import { AssetsForLambdaResponse } from '../assets.interface';
import { PairDto } from './pair.dto';

export class AssetsPoolsDto implements AssetsForLambdaResponse {
  @ApiProperty({ type: Number, example: ChainIdEnum.eth })
  chainId: number;

  @ApiProperty({ type: String, example: '0x3d56fa439a97632922d2b265fbc1426aa2f8e443' })
  address: string;

  @ApiProperty({ type: Number, example: 18 })
  decimals: number;

  @ApiProperty({ type: Number, example: 12324 })
  id: number;

  @ApiProperty({ type: String, example: 'Ethereum', required: false })
  name: string = null;

  @ApiProperty({ type: String, example: 'ETH', required: false })
  symbol: string = null;

  @ApiProperty({ type: PairDto, isArray: true, required: false })
  pairs: PairDto[] = null;
}

export class AssetsPoolsPostResponseDto {
  @ApiProperty({ enum: HttpStatus, example: HttpStatus.CREATED })
  statusCode: HttpStatus;

  @ApiProperty({ type: String, example: 'Success message' })
  message: string;

  @ApiProperty({ type: String, example: 'Stack message', required: false })
  error?: string;

  constructor(statusCode: number, message: string, error?: string) {
    this.statusCode = statusCode;
    this.message = message;
    this.error = error;
  }
}
