import { ApiProperty } from '@nestjs/swagger';

import { AuditDto } from 'src/common/DTO/Audit.dto';
import { SafeTokenDto } from 'src/common/DTO/SafeToken.dto';

import { PartnerAuditDto } from './partner.audit.dto';

export class ProjectDto {
  @ApiProperty({ type: Number, example: 841 })
  id: number;

  @ApiProperty({ type: String, example: 'Iron Finance' })
  name: string;

  @ApiProperty({ type: String, example: 'https://polygon.iron.finance/' })
  url: string;

  @ApiProperty({ type: String, example: 'safe/files/audit/logo/60cce6561622c.jpeg' })
  logoLink: string;

  @ApiProperty({ type: Boolean, example: true })
  active: boolean;

  @ApiProperty({ type: [SafeTokenDto] })
  tokens: SafeTokenDto[];

  @ApiProperty({ type: [AuditDto] })
  defiyieldAudits: AuditDto[];

  @ApiProperty({ type: [PartnerAuditDto] })
  partnerAudits: PartnerAuditDto[];
}
