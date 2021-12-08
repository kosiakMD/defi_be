// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { ResultStatus } from '../enum';
import { DetailedResponse } from '../interfaces';

export * from './contracts/contract.approval.response.dto';
export * from './contracts/contract.approval.detailed.response.dto';
export * from './contracts/contract.project.dto';
export * from './contracts/contract.approval.dto';
export * from './ERC20Token.dto';
export * from './EthereumAddress.dto';
export * from '../../modules/nft/dto/base.collection.dto';
export * from '../../modules/nft/dto/collection.dto';
export * from '../../modules/nft/dto/collection.stats.dto';
export * from '../../modules/nft/dto/contract.dto';
export * from '../../modules/nft/dto/last.sale.dto';
export * from '../../modules/nft/dto/maker.dto';
export * from '../../modules/nft/nft.asset.dto';
export * from '../../modules/nft/dto/order.dto';
export * from '../../modules/nft/dto/payment.token.dto';
export * from '../../modules/nft/dto/trait.dto';

export abstract class DetailedResponseDto<T> implements DetailedResponse<T> {
  protected constructor(status: ResultStatus, errors: Error[] | string[], data: T) {
    this.status = status;
    this.errors = errors;
    this.data = data;
  }

  @ApiProperty({
    type: String,
    enum: ResultStatus,
    enumName: 'ResultStatus',
    example: ResultStatus.ok,
  })
  status: ResultStatus;

  @ApiProperty({
    type: [String],
    example: ['connect ECONNREFUSED ...'],
  })
  errors: Array<Error | string>;

  // @ApiProperty({
  // isArray: true,
  // type: Object,
  // })
  data: T;
}

export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }

  from(data: string): number {
    return Number(data);
  }
}
