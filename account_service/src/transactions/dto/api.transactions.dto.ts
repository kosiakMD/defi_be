// eslint-disable-next-line max-classes-per-file
import { ApiProperty } from '@nestjs/swagger';

class TransactionDto {
  @ApiProperty()
  blockNumber: string;
  @ApiProperty()
  timeStamp: string;
  @ApiProperty()
  hash: string;
  @ApiProperty()
  nonce: string;
  @ApiProperty()
  blockHash: string;
  @ApiProperty()
  transactionIndex: string;
  @ApiProperty()
  from: string;
  @ApiProperty()
  to: string;
  @ApiProperty()
  value: string;
  @ApiProperty()
  gas: string;
  @ApiProperty()
  gasPrice: string;
  @ApiProperty()
  isError: string;
  @ApiProperty()
  txreceiptStatus: string;
  @ApiProperty()
  input: string;
  @ApiProperty()
  contractAddress: string;
  @ApiProperty()
  cumulativeGasUsed: string;
  @ApiProperty()
  gasUsed: string;
  @ApiProperty()
  confirmations: string;
  @ApiProperty()
  chainId: number;
  @ApiProperty()
  isInternal?: boolean;
}

export class ApiTransactionsResponseDto {
  @ApiProperty({ type: TransactionDto, isArray: true })
  address: TransactionDto;
}
