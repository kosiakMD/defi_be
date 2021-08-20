import { Exclude, Expose, plainToClass, Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { NetworkDto } from 'src/common/dto/network.dto';

import { AuditedByDto } from './audited.by.dto';
import { LinksDto } from './links.dto';
import { ScamTypeDto } from './scam.type.dto';
import { TokenDto } from './token.dto';

@Exclude()
export class ScamDto {
  @Expose()
  @ApiProperty({ type: Number, example: 2546 })
  id: number;

  @Expose({ name: 'project_name' })
  @ApiProperty({ type: String, example: 'Cover Protocol' })
  name: string;

  @Expose()
  @ApiProperty({
    type: String,
    example: 'The exploit affected the mining contract and the $COVER token.',
  })
  description: string;

  @Expose({ name: 'function_text' })
  @ApiProperty({ type: String, example: '<p>work()</p>' })
  functionText: string;

  @Expose({ name: 'funds_lost' })
  @ApiProperty({ type: String, example: '940000' })
  fundsLost: string;

  @Expose({ name: 'technical_issue' })
  @ApiProperty({ type: String, example: '' })
  technicalIssue: string;

  @Expose()
  @ApiProperty({ type: Boolean, example: true })
  active: boolean;

  @Expose()
  @Transform(({ obj }) => plainToClass(ScamTypeDto, obj.scam_type)) // eslint-disable-line camelcase
  @ApiProperty({ type: ScamTypeDto })
  scamType: ScamTypeDto;

  @Expose()
  @Transform(({ obj }) => plainToClass(TokenDto, obj))
  @ApiProperty({ type: TokenDto })
  token: TokenDto;

  @Expose()
  @ApiProperty({ type: NetworkDto })
  network: NetworkDto;

  @Expose()
  @Transform(({ obj }) => plainToClass(LinksDto, obj))
  @ApiProperty({ type: LinksDto })
  links: LinksDto;

  @Expose()
  @ApiProperty({ type: [AuditedByDto] })
  @Transform(({ obj }) => plainToClass(AuditedByDto, obj.auditedBy))
  auditedBy: AuditedByDto[];

  @Expose()
  @ApiProperty({ type: String, example: '2020-12-28' })
  date: string;
}
