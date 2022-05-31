import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

import { Address } from '@app/common';
import { BaseListQueryDto } from '@app/common/dto/base-list-query.dto';
import { NftAssetSortFieldEnum } from '@app/common/enum/nft/nft.enums';
import { splitToArray, unifyAddress, unifyAddresses } from '@app/common/utils';

export class NftAssetsQueryDtoV1 extends BaseListQueryDto {
  @ApiProperty({
    type: [String],
    example: [
      '0x64850F38e800E04eF773efca8FCaFdceFe977f9D',
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85',
    ],
  })
  @Transform(({ value }) =>
    Array.isArray(value) ? unifyAddresses(value) : splitToArray(value).map(unifyAddress),
  )
  addresses: Address[] = null;

  @ApiProperty({ type: [Number], example: [1, 4, 12, 19], default: [], required: false })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value.map((n) => Number(n)) : [Number(value)]))
  chains: number[] = [];

  @ApiProperty({
    type: [String],
    example: 'young-lives-matter',
    required: false,
  })
  @IsString()
  @IsOptional()
  collection?: string = null;

  @ApiProperty({
    enum: NftAssetSortFieldEnum,
    example: NftAssetSortFieldEnum.PRICE,
    default: NftAssetSortFieldEnum.PRICE,
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sortField = NftAssetSortFieldEnum.PRICE;

  @ApiProperty({ type: String, default: '', required: false })
  @IsString()
  @IsOptional()
  search = '';
}
