// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ApprovalDetailed, ApprovalProject, ApprovalToken } from './account.interfaces';
import { ChainIdEnum } from 'src/common/enum';
import { Address } from 'src/common/interfaces';

export class ApprovalProjectDTO implements ApprovalProject {
  @ApiProperty({ type: Number, example: 18 })
  id: number;
  @ApiProperty({ type: String, example: 'curve' })
  name: string;
  @ApiProperty({
    type: String,
    example:
      'https://admapidev2.defiyield.info/projects/icons/92b6da7e9748da25ffd9a9a671351a32.png',
  })
  icon: string;
  @ApiProperty({ type: String, example: 'curve.fi' })
  description: string;
}

export class ApprovalTokenDTO implements ApprovalToken {
  @ApiProperty({ type: String, example: '0xb36a5f0bdec9c474e7eb6ab36a9ed20736205789' })
  id: Address;
  @ApiProperty({
    type: String,
    example:
      'https://admapidev2.defiyield.info/projects/icons/92b6da7e9748da25ffd9a9a671351a32.png',
  })
  icon: string;
  @ApiProperty({ type: String, example: 'Dai Stablecoin' })
  name: string;
  @ApiProperty({ type: String, example: 'DAI' })
  symbol: string;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;
}

export class ApprovalDetailedDto implements ApprovalDetailed {
  @ApiProperty({ enum: ChainIdEnum, enumName: 'ChainIdEnum', example: ChainIdEnum.eth })
  chainId: ChainIdEnum;

  @ApiProperty({
    type: String,
    example: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  })
  allowance: string;

  @ApiProperty({ type: Number, example: 12227970 })
  blockNumber: number;

  @ApiProperty({ type: Number, example: 1618266321 })
  blockTimestamp: number;

  @ApiProperty({ type: ApprovalProjectDTO })
  project: ApprovalProject;

  @ApiProperty({ type: String, example: '0x0000000000000000000000000000000000000000' })
  spender: string;

  @ApiProperty({ type: ApprovalTokenDTO })
  token: ApprovalToken;
}

export class ApprovalDTO {
  @ApiProperty({ type: [ApprovalDetailedDto] })
  '0x94dfce828c3daaf6492f1b6f66f9a1825254d24b': ApprovalDetailedDto[];
}
