// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ApprovalBsc, ApprovalProject, ApprovalToken } from './account.interfaces';

export class ApprovalProjectDTO implements ApprovalProject {
  @ApiProperty({ type: Object, example: 0 })
  id;
  @ApiProperty({ type: String, example: null })
  name;
  @ApiProperty({ type: String, example: null })
  icon;
  @ApiProperty({ type: String, example: null })
  description;
}

export class ApprovalTokenDTO implements ApprovalToken {
  @ApiProperty({ type: String, example: '0xb36a5f0bdec9c474e7eb6ab36a9ed20736205789' })
  id;
  @ApiProperty({ type: String, example: null })
  icon;
  @ApiProperty({ type: String, example: null })
  name;
  @ApiProperty({ type: String, example: null })
  symbol;
  @ApiProperty({ type: String, example: null })
  decimals;
}

export class ApprovalBscDTO implements ApprovalBsc {
  @ApiProperty({ type: String, example: '0x' })
  allowance;

  @ApiProperty({ type: Number, example: 12227970 })
  blockNumber;

  @ApiProperty({ type: Number, example: 1618266321 })
  blockTimestamp;

  @ApiProperty({ type: ApprovalProjectDTO })
  project;

  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  spender;

  @ApiProperty({ type: ApprovalTokenDTO })
  token;
}
