import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { BaseListQueryDto } from '@app/common/dto/base-list-query.dto';

import { ApprovalsSortFieldsEnum } from '../enum/approvals-sort-fields.enum';

export class GetAllApprovalsDto extends BaseListQueryDto {
  @ApiProperty({
    type: String,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    enum: ApprovalsSortFieldsEnum,
    required: false,
  })
  @IsEnum(ApprovalsSortFieldsEnum)
  @IsOptional()
  sortField = ApprovalsSortFieldsEnum.BLOCK_NUMBER;
}
