import { ApiProperty } from '@nestjs/swagger';

import { TransactionCovalent } from '../interfaces/transactions.interfaces';
import { TransactionCovalentDto } from './transaction.covalent.dto';
import { ResultStatus } from 'src/common/enum';
import { DetailedResponse } from 'src/common/interfaces';

export class TransactionCovalentResponseDto implements DetailedResponse<TransactionCovalent[]> {
  @ApiProperty({ enum: ResultStatus, enumName: 'ResultStatus' })
  status: ResultStatus;

  @ApiProperty({ type: [String], example: [] })
  errors: Array<Error | string>;

  @ApiProperty({
    type: [TransactionCovalentDto],
    example: [
      {
        chainId: 1,
        blockNumber: 11782395,
        blockHash: '0xfef3343fbba1520072171170ef0aa28ff999eff3cbd924fa3d038587651f1eef',
        hash: '0xfef3343fbba1520072171170ef0aa28ff999eff3cbd924fa3d038587651f1eef',
        timeStamp: '2021-02-03T09:10:42Z',
        value: '420499960000000000',
        valueInCurrency: 696.1136097466455,
        currency: 'USD',
        gasPrice: 183000000000,
        gasUsed: 21000,
        isError: '0',
      },
    ],
  })
  data: TransactionCovalent[];
}
