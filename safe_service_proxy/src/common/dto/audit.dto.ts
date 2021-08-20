import { Exclude, Expose } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class AuditDto {
  @Expose()
  @ApiProperty({ type: Number, example: 836 })
  id: number;

  @Expose()
  @ApiProperty({ type: String, example: 'Security Audit' })
  name: string;

  @Expose()
  @ApiProperty({ type: String, example: '45.75' })
  score: string;

  @Expose({ name: 'tech_issues' })
  @ApiProperty({ type: Number, example: 43 })
  techIssues: number;

  @Expose({ name: 'tech_issues_low' })
  @ApiProperty({ type: Number, example: 26 })
  techIssuesLow: number;

  @Expose({ name: 'tech_issues_medium' })
  @ApiProperty({ type: Number, example: 13 })
  techIssuesMedium: number;

  @Expose({ name: 'tech_issues_high' })
  @ApiProperty({ type: Number, example: 4 })
  techIssuesHigh: number;

  @Expose()
  @ApiProperty({ type: String, example: '2021-06-17' })
  date: string;

  @Expose({ name: 'audit_link' })
  @ApiProperty({
    type: String,
    example: 'safe/files/audit/pdf/security_audit_for_iron_finance.pdf',
  })
  auditLink: string;
}
