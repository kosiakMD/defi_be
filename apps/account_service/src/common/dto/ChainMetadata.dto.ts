import { IsObject } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { IChainMetadata } from '@app/common/interfaces/chain.metadata.interface';

export class ChainMetadata implements IChainMetadata {
  @ApiProperty({ type: String, description: 'Absolute chain id' })
  absoluteChainId: string;

  @ApiProperty({ type: String, description: 'Coingecko platform id' })
  coingeckoPlatformId: string;

  @ApiProperty({ type: String, description: 'Debank platform id' })
  debankPlatformId: string;

  @ApiProperty({ type: String, description: 'Balance checker address' })
  balancesCheckerAddress: string;

  @ApiProperty({ type: Object, description: 'Network parameters' })
  @IsObject()
  network: {
    type: string;
  };
}
