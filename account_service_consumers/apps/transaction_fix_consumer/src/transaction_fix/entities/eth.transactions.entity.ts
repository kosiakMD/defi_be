import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryColumn } from 'typeorm';

import { CHAIN_ID_ETH } from '../../util/util';
import { MigrationEvent } from '../transaction.fix.interface';

@Entity('eth_transactions')
export class EthTransactionsEntity {
  @ApiProperty({
    type: String,
    example: '0x7655d50037c8d2af6f0f8c1393d43b813e2e058689a1028d618c91f2736e8e68',
  })
  @PrimaryColumn()
  hash: string;

  @ApiProperty({
    type: Number,
    example: 12000000,
  })
  @Column({ name: 'block_number' })
  blockNumber: number;

  @ApiProperty({
    type: String,
    example: '0x89643020e320d43b1b801d27438573476c5272c5',
  })
  @Column()
  from: string;

  @ApiProperty({
    type: String,
    example: '0x89643020e320d43b1b801d27438573476c5272c5',
  })
  @Column()
  to: string;

  @ApiProperty({
    type: String,
    example: '0xa9059cbb00000000000000000000000086904e32b0d7a8e1ab4dc4a02bae7ff93e9a2d330000000000',
  })
  @Column()
  input: string;

  @ApiProperty({
    type: Number,
    example: 3000000000,
  })
  @Column()
  value: number;

  @ApiProperty({
    type: Number,
    example: 21000,
  })
  @Column()
  gas: number;

  @ApiProperty({
    type: String,
    example: '10000000000',
  })
  @Column({ name: 'gas_price' })
  gasPrice: string;

  @ApiProperty({
    type: String,
    example: '70',
  })
  @Column()
  index: string;

  @ApiProperty({
    type: String,
    example: '1626846134',
  })
  timestamp?: string;

  @ApiProperty({
    type: Array,
  })
  events?: MigrationEvent[];

  @ApiProperty({
    type: Number,
    example: 5165,
  })
  gasUsed?: number;

  @ApiProperty({
    type: Number,
    example: 1234,
  })
  gasUsedUsd?: number;

  @ApiProperty({
    type: Number,
    example: CHAIN_ID_ETH,
  })
  chainId: number;
}
