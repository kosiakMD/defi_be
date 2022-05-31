import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class RPCResponse {
  @ApiProperty({ type: String, example: '2.0' })
  @IsString()
  @IsOptional()
  jsonrpc: string;

  @ApiProperty({ type: String, example: '135484789GJHKGF2' })
  @IsNotEmpty()
  id: string;

  @ApiProperty({ type: Object, example: { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' } })
  @IsOptional()
  result?: any;

  @ApiProperty({
    type: Object,
    example: {
      code: -32601,
      message: 'The method eth_blockNumberd does not exist/is not available',
    },
  })
  @IsOptional()
  error?: any;
}
