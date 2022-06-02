import { ApiProperty } from '@nestjs/swagger';

export class AuditDto {
  @ApiProperty({ type: Number, example: 836 })
  id: number;

  @ApiProperty({ type: String, example: 'Security Audit' })
  name: string;

  @ApiProperty({ type: String, example: '45.75' })
  score: string;

  @ApiProperty({ type: Number, example: 43 })
  techIssues: number;

  @ApiProperty({ type: Number, example: 26 })
  techIssuesLow: number;

  @ApiProperty({ type: Number, example: 13 })
  techIssuesMedium: number;

  @ApiProperty({ type: Number, example: 4 })
  techIssuesHigh: number;

  @ApiProperty({ type: String, example: '2021-06-17' })
  date: string;

  @ApiProperty({
    type: String,
    example: 'safe/files/audit/pdf/security_audit_for_iron_finance.pdf',
  })
  auditLink: string;
}
