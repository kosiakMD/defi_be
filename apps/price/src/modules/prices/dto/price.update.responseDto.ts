import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class PriceUpdateResponseDto {
  @ApiProperty({ type: Number, example: HttpStatus.CREATED })
  statusCode: number;

  @ApiProperty({ type: String, example: 'Success message' })
  message: string;

  @ApiProperty({ type: Error, example: 'An error occurred' })
  error?: Error;
}
