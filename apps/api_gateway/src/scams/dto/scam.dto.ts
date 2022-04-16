import { ApiProperty } from '@nestjs/swagger';

import { NetworkBaseDto } from '@app/common/dto';

import { AuditedByDto } from './audited.by.dto';
import { ScamLinksDto } from './scam.links.dto';
import { ScamTypeDto } from './scam.type.dto';
import { TokenDto } from './token.dto';

export class ScamDto {
  @ApiProperty({ type: Number, example: 2546 })
  id: number;

  @ApiProperty({ type: String, example: 'Cover Protocol' })
  name: string;

  @ApiProperty({
    type: String,
    example: 'The exploit affected the mining contract and the $COVER token.',
  })
  description: string;

  @ApiProperty({ type: String, example: '<p>work()</p>' })
  functionText: string;

  @ApiProperty({ type: String, example: '940000' })
  fundsLost: string;

  @ApiProperty({ type: String, example: '' })
  technicalIssue: string;

  @ApiProperty({ type: Boolean, example: true })
  active: boolean;

  @ApiProperty({ type: ScamTypeDto })
  scamType: ScamTypeDto;

  @ApiProperty({ type: TokenDto })
  token: TokenDto;

  @ApiProperty({ type: NetworkBaseDto })
  network: NetworkBaseDto;

  @ApiProperty({ type: ScamLinksDto })
  links: ScamLinksDto;

  @ApiProperty({ type: [AuditedByDto] })
  auditedBy: AuditedByDto[];

  @ApiProperty({ type: String, example: '2020-12-28' })
  date: string;
}
