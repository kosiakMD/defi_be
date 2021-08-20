import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('eth_events')
export class EthEventsEntity {
  @ApiProperty({
    type: Number,
    example: 15,
  })
  @PrimaryGeneratedColumn()
  id?: number;

  @ApiProperty({
    type: String,
    example: '0x7655d50037c8d2af6f0f8c1393d43b813e2e058689a1028d618c91f2736e8e68',
  })
  @Column({ name: 'transaction_hash' })
  transactionHash: string;

  @ApiProperty({
    type: String,
    example: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  })
  @Column({ name: 'topic_1' })
  topic1: string;

  @ApiProperty({
    type: String,
    example: '0x000000000000000000000000eb46faa47a6a52519839a2e52c7b28a2db17651e',
  })
  @Column({ name: 'topic_2' })
  topic2: string;

  @ApiProperty({
    type: String,
    example: '0x0000000000000000000000008867f20c1c63baccec7617626254a060eeb0e61e',
  })
  @Column({ name: 'topic_3' })
  topic3: string;

  @ApiProperty({
    type: String,
    example: '0x0000000000000000000000008867f20c1c63baccec7617626254a060eeb0e61e',
  })
  @Column()
  topics: string;

  @ApiProperty({
    type: Number,
    example: 12000000,
  })
  @Column({ name: 'block_number' })
  blockNumber: number;

  @ApiProperty({
    type: String,
    example: '0x',
  })
  @Column()
  data: string;

  @ApiProperty({
    type: String,
    example: '0xE03b49682965A1EB5230D41f96E10896dc563F0D',
  })
  @Column()
  address: string;

  @ApiProperty({
    type: Number,
    example: 120,
  })
  @Column({ name: 'log_index' })
  logIndex: number;

  @ApiProperty({
    type: Number,
    example: 1626846134,
  })
  blockTimestamp?: number;
}
