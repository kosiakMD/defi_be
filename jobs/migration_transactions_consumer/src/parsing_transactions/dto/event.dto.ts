import { Exclude, Expose, Transform } from 'class-transformer';
import Web3 from 'web3';

import { ApiProperty } from '@nestjs/swagger';

import { ETH_ADDRESS } from '../../util/util';
import { MigrationEvent } from '../transactions.parsing.interfaces';

export class EventDto implements MigrationEvent {
  @ApiProperty()
  @Exclude()
  transactionHash: string;
  @ApiProperty()
  @Exclude()
  topic1?: string;
  @ApiProperty()
  @Expose({ name: 'from' })
  @Transform(({ value }) => value?.toLowerCase())
  topic2?: string;
  @ApiProperty()
  @Expose({ name: 'to' })
  @Transform(({ value }) => value?.toLowerCase())
  topic3?: string;
  @ApiProperty()
  @Exclude()
  topics?: string;
  @ApiProperty()
  @Expose()
  blockNumber: number;
  @ApiProperty()
  @Expose({ name: 'value' })
  @Transform(({ value }) => Web3.utils.fromDecimal(value))
  data?: string;
  @ApiProperty()
  address?: string = ETH_ADDRESS;
  @ApiProperty()
  @Exclude()
  logIndex?: number;
  @ApiProperty()
  @Exclude()
  blockTimestamp: number;

  constructor(data: EventDto) {
    Object.assign(this, data);
  }
}
