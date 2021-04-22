// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

import { Transaction } from './transactions.interfaces';

class GasDto {
  @ApiProperty({ example: 1.1900000000000001e-7 })
  price: number;
  @ApiProperty({ example: 0.0024990000000000004 })
  eth: number;
  @ApiProperty({ example: 0 })
  usd: number;
}

class AmountDto {
  @ApiProperty({ example: 0.0362313268178732 })
  eth: number;
  @ApiProperty({ example: 0 })
  usd: number;
}

class TransactionDto implements Transaction {
  @ApiProperty({ example: 1 })
  chainId: number;
  @ApiProperty({ example: '0xc343e8f4f3109390d62c4004b814df4d68747c8b6b6d60d1b4c33436aa8d93e0' })
  hash: string;
  @ApiProperty({ example: '11932496' })
  blockNumber: string;
  @ApiProperty({ example: '0xf90dce9671765d8cf9634122cd2306cd094c777c' })
  from: string;
  @ApiProperty({ example: '0x782629c9578889a9b8464f051f23843734f72599' })
  to: string;
  @ApiProperty({ example: '1614338271' })
  blockTimestamp: string;
  @ApiProperty({ type: AmountDto })
  amount: AmountDto;
  @ApiProperty({ type: GasDto })
  gas: GasDto;
}

export class TransactionsResponseDto {
  @ApiProperty({
    description: 'Address which comes as param',
    example: [
      {
        chainId: 1,
        hash: '0xc343e8f4f3109390d62c4004b814df4d68747c8b6b6d60d1b4c33436aa8d93e0',
        blockNumber: '11932496',
        from: '0xf90dce9671765d8cf9634122cd2306cd094c777c',
        to: '0x782629c9578889a9b8464f051f23843734f72599',
        blockTimestamp: '1614338271',
        amount: {
          eth: 0.0362313268178732,
          usd: 0,
        },
        gas: {
          price: 1.1900000000000001e-7,
          eth: 0.0024990000000000004,
          usd: 0,
        },
      },
    ],
  })
  // eslint-disable-next-line prettier/prettier
  // [address: string]: TransactionDto[];
  '0x782629c9578889a9b8464f051f23843734f72599': TransactionDto[];
}
