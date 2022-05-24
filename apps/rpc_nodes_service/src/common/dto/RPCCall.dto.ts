import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class RPCCallDto {
  @ApiProperty({ type: String, required: false, example: '2.0' })
  @IsString()
  @IsOptional()
  jsonrpc?: string;

  @ApiProperty({ type: String, required: true, example: 'eth_blockNumber' })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ type: Number, required: true, example: '135484789GJHKGF2' })
  @IsNotEmpty()
  id: string | number;

  @ApiProperty({
    required: false,
    type: 'array',
    items: {
      oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'object' }],
    },
  })
  @IsOptional()
  params?: (string | number | boolean | object)[];
}
