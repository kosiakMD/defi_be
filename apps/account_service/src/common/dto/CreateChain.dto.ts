import { IsNotEmpty, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { ChainMetadata } from './ChainMetadata.dto';

export class CreateChainDto {
  @ApiProperty({ type: String, description: 'Chain name' })
  @IsNotEmpty()
  @IsString()
  public name: string;

  @ApiProperty({ type: String, description: 'Chain abbr' })
  @IsNotEmpty()
  @IsString()
  public abbr: string;

  @ApiProperty({ type: ChainMetadata, nullable: false })
  public metadata: ChainMetadata;
}
