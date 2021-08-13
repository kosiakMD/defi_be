import { Exclude, Expose, plainToClass, Transform } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

import { AuditDto } from '../../common/dto/audit.dto';
import { TokenDto } from 'src/common/dto/token.dto';

import { PartnerAuditDto } from './partner.audit.dto';

@Exclude()
export class ProjectDto {
  @Expose()
  @ApiProperty({ type: Number, example: 841 })
  id: number;

  @Expose({ name: 'project_name' })
  @ApiProperty({ type: String, example: 'Iron Finance' })
  name: string;

  @Expose({ name: 'project_link' })
  @ApiProperty({ type: String, example: 'https://polygon.iron.finance/' })
  url: string;

  @Expose({ name: 'logo_link' })
  @ApiProperty({ type: String, example: 'safe/files/audit/logo/60cce6561622c.jpeg' })
  logoLink: string;

  @Expose()
  @ApiProperty({ type: Boolean, example: true })
  active: boolean;

  @Expose()
  @Transform(({ obj }) => plainToClass(TokenDto, obj.auditNetworks))
  @ApiProperty({ type: [TokenDto] })
  tokens: TokenDto[];

  @Expose()
  @Transform(({ obj }) => plainToClass(AuditDto, obj.auditFile))
  @ApiProperty({ type: [AuditDto] })
  defiyieldAudits: AuditDto[];

  @Expose()
  @Transform(({ obj }) => plainToClass(PartnerAuditDto, obj.partnerAudits))
  @ApiProperty({ type: [PartnerAuditDto] })
  partnerAudits: PartnerAuditDto[];
}
