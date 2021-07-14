import { ApiProperty } from '@nestjs/swagger';

export class TransactionBaseDto {
  @ApiProperty({ example: '10266704', type: String })
  blockNumber: string;
  @ApiProperty({ example: '1592175374', type: String })
  timeStamp: string;
  @ApiProperty({
    example: '0x6e4095c452687edc2d4a3446036131786eb1a57264c8eb332663a66f45649465',
    type: String,
  })
  hash: string;
  @ApiProperty({ example: '1', type: String })
  nonce: string;
  @ApiProperty({
    example: '0x09cf6f9840af268c4e47a6c6ae2d8465dcded1718af0e7041a75ace165978b3c',
    type: String,
  })
  blockHash: string;
  @ApiProperty({ example: '56', type: String })
  transactionIndex: string;
  @ApiProperty({ example: '0xc4b5c60672ae9e714add00eed9325c4a583e4cbd', type: String })
  from: string;
  @ApiProperty({ example: '0xcff17036c5ae141f2244f480fc16ba244ffab33b', type: String })
  to: string;
  @ApiProperty({ example: '424342961679074563', type: String })
  value: string;
  @ApiProperty({ example: '25200', type: String })
  gas: string;
  @ApiProperty({ example: '13200000000', type: String })
  gasPrice: string;
  @ApiProperty({ example: '0', type: String })
  isError: string;
  @ApiProperty({ example: '0x', type: String })
  input: string;
  @ApiProperty({ example: '', type: String })
  contractAddress: string;
  @ApiProperty({ example: '3696510', type: String })
  cumulativeGasUsed: string;
  @ApiProperty({ example: '21000', type: String })
  gasUsed: string;
  @ApiProperty({ example: '2390490', type: String })
  confirmations: string;
  @ApiProperty({ example: 1, type: Number })
  chainId: number;
}
