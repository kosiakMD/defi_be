// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

class GasDto {
  @ApiProperty()
  price: number;
  @ApiProperty()
  eth: number;
  @ApiProperty()
  usd: number;
}

class AmountDto {
  @ApiProperty()
  eth: number;
  @ApiProperty()
  usd: number;
}

class TransactionDto {
  @ApiProperty()
  eth: number;
  @ApiProperty()
  usd: number;

  @ApiProperty()
  chainId: number;
  @ApiProperty()
  hash: string;
  @ApiProperty()
  blockNumber: string;
  @ApiProperty()
  from: string;
  @ApiProperty()
  to: string;
  @ApiProperty({ type: AmountDto })
  amount: AmountDto;
  @ApiProperty({ type: GasDto })
  gas: GasDto;
  @ApiProperty()
  gasPrice: string;
  @ApiProperty()
  timeStamp: string;
}

export class TransactionsResponseDto {
  @ApiProperty({ type: TransactionDto, isArray: true })
  address: TransactionDto;
}
